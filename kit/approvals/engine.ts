import type { Prisma } from "@prisma/client";
import { conditionHolds, getAction, getDataSource, type Row } from "@/kit/blocks";
import { rolesFor } from "@/kit/auth/roles";
import type { Session } from "@/kit/auth/session";
import { audit } from "@/kit/audit/log";
import { loadApp } from "@/kit/config/loader";
import type { AppConfig } from "@/kit/config/schema";
import { prisma } from "@/kit/db";
import { AccessDenied, approverRolesFor } from "@/kit/view";

export type ActionOutcome =
  | { kind: "executed"; requestId: string }
  | { kind: "pending"; requestId: string }
  | { kind: "already_decided" };

/**
 * Approval is required if the action's own minimum rule fires OR the app
 * config's rule fires. Config can add requirements; it can never remove the
 * minimum declared in code.
 */
export function approvalRequired(config: AppConfig, actionName: string, row: Row): boolean {
  const action = getAction(actionName);
  const entry = config.actions.find((a) => a.use === actionName);
  const minFires = action.minApproval ? conditionHolds(action.minApproval.when, row) : false;
  const configFires = entry?.approval ? conditionHolds(entry.approval.when, row) : false;
  return minFires || configFires;
}

async function runAction(
  tx: Prisma.TransactionClient,
  slug: string,
  actionName: string,
  row: Row,
  actor: string,
  requestId: string,
): Promise<void> {
  const action = getAction(actionName);
  await action.execute({ actor, app: slug, row, approvalRequestId: requestId, tx });
  await audit(
    { actor, app: slug, action: `${actionName}.executed`, recordId: String(row.id) },
    tx,
  );
}

/** Entry point for every action. Authorization is enforced here, not in the UI. */
export async function performAction(
  slug: string,
  actionName: string,
  recordId: string,
  session: Session,
): Promise<ActionOutcome> {
  const config = loadApp(slug);
  const roles = rolesFor(config, session);
  const entry = config.actions.find((a) => a.use === actionName);
  if (!entry) throw new AccessDenied(`Action ${actionName} is not enabled on ${slug}`);
  if (!entry.allowed_roles.some((r) => roles.includes(r))) {
    throw new AccessDenied(`${session.username} may not run ${actionName} on ${slug}`);
  }

  const row = await getDataSource(config.datasource).readOne(recordId);
  if (!row) throw new Error(`Record ${recordId} not found`);

  const needsApproval = approvalRequired(config, actionName, row);

  return prisma.$transaction(async (tx) => {
    const request = await tx.approvalRequest.create({
      data: {
        app: slug,
        action: actionName,
        recordId,
        requestedBy: session.username,
        status: needsApproval ? "pending" : "auto_approved",
        payload: row as Prisma.InputJsonValue,
      },
    });
    await audit(
      {
        actor: session.username,
        app: slug,
        action: `${actionName}.requested`,
        recordId,
        detail: { requestId: request.id, needsApproval },
      },
      tx,
    );

    if (needsApproval) return { kind: "pending", requestId: request.id };

    await runAction(tx, slug, actionName, row, session.username, request.id);
    return { kind: "executed", requestId: request.id };
  });
}

export async function approve(requestId: string, session: Session): Promise<ActionOutcome> {
  const request = await prisma.approvalRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error(`Approval request ${requestId} not found`);

  const config = loadApp(request.app);
  const roles = rolesFor(config, session);
  const approverRoles = approverRolesFor(config, request.action);
  if (!approverRoles.some((r) => roles.includes(r))) {
    throw new AccessDenied(`${session.username} may not approve ${request.action}`);
  }
  if (request.requestedBy === session.username) {
    throw new AccessDenied("Maker-checker: you cannot approve your own request");
  }

  return prisma.$transaction(async (tx) => {
    // Conditional update: only the transaction that flips pending -> approved
    // gets to run the action, so approving twice cannot execute twice.
    const claimed = await tx.approvalRequest.updateMany({
      where: { id: requestId, status: "pending" },
      data: { status: "approved", decidedBy: session.username, decidedAt: new Date() },
    });
    if (claimed.count !== 1) return { kind: "already_decided" };

    await audit(
      {
        actor: session.username,
        app: request.app,
        action: `${request.action}.approved`,
        recordId: request.recordId,
        detail: { requestId },
      },
      tx,
    );
    await runAction(
      tx,
      request.app,
      request.action,
      request.payload as Row,
      session.username,
      requestId,
    );
    return { kind: "executed", requestId };
  });
}

export async function pendingRequestsFor(session: Session) {
  const requests = await prisma.approvalRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  return requests.filter((request) => {
    let config: AppConfig;
    try {
      config = loadApp(request.app);
    } catch {
      return false;
    }
    const roles = rolesFor(config, session);
    return approverRolesFor(config, request.action).some((r) => roles.includes(r));
  });
}
