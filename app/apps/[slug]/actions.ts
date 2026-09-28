"use server";

import { revalidatePath } from "next/cache";
import { performAction, approve } from "@/kit/approvals/engine";
import { requireSession } from "@/kit/auth/session";
import { exportAppCsv } from "@/kit/view";

export type ActionResult = { ok: boolean; message: string };

export async function runAppAction(
  slug: string,
  actionName: string,
  recordId: string,
): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const outcome = await performAction(slug, actionName, recordId, session);
    revalidatePath(`/apps/${slug}`);
    revalidatePath("/approvals");
    if (outcome.kind === "pending") {
      return { ok: true, message: "Sent for approval. An approver must sign off." };
    }
    return { ok: true, message: "Done." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export type ExportResult = { ok: boolean; message: string; csv?: string; filename?: string };

/** The download is produced server-side from the authorized, masked view. */
export async function exportCsv(slug: string): Promise<ExportResult> {
  const session = await requireSession();
  try {
    const csv = await exportAppCsv(slug, session);
    revalidatePath("/audit");
    return { ok: true, message: "Exported. The download is recorded in the audit log.", csv, filename: `${slug}.csv` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function approveRequest(requestId: string): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const outcome = await approve(requestId, session);
    revalidatePath("/approvals");
    revalidatePath("/audit");
    if (outcome.kind === "already_decided") {
      return { ok: false, message: "This request was already decided." };
    }
    if (outcome.kind === "cancelled") {
      return { ok: false, message: `Cancelled: ${outcome.reason}` };
    }
    return { ok: true, message: "Approved and executed." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
