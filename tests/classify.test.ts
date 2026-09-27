import { describe, expect, it } from "vitest";
import { classify, loadRules, type ChangedFile } from "@/review/classify";

const rules = loadRules();

const flagsApp = `
name: Feature flags
owner: platform-eng
datasource: feature_flags
roles:
  admin: [platform-eng]
view:
  columns: [key, description, environment, enabled]
  visible_to: [admin]
actions:
  - use: toggle_flag
    allowed_roles: [admin]
`;

const flagsAppWithApproval = `${flagsApp}    approval:
      when: { field: environment, equals: production }
      approver_roles: [admin]
`;

const refundsApp = `
name: Refunds
owner: payments-ops
datasource: refund_requests
roles:
  analyst: [refunds-analysts]
  approver: [refunds-approvers]
view:
  columns: [customer_name, amount, status]
  visible_to: [analyst, approver]
  show_sensitive_to: [approver]
actions:
  - use: issue_refund
    allowed_roles: [analyst]
`;

function added(path: string, head: string): ChangedFile {
  return { status: "A", path, head };
}

function modified(path: string, base: string, head: string): ChangedFile {
  return { status: "M", path, base, head };
}

describe("review classifier", () => {
  it("self-serves a new app that only uses low-risk actions", () => {
    expect(classify([added("apps/feature-flags.yaml", flagsApp)], rules).decision).toBe("SELF-SERVE");
  });

  it("escalates when an approval block is added", () => {
    const result = classify(
      [modified("apps/feature-flags.yaml", flagsApp, flagsAppWithApproval)],
      rules,
    );

    expect(result.decision).toBe("ESCALATE");
    expect(result.reasons.join(" ")).toMatch(/approval block/i);
  });

  it("escalates any app that uses a high-risk action", () => {
    const result = classify([added("apps/refunds.yaml", refundsApp)], rules);

    expect(result.decision).toBe("ESCALATE");
    expect(result.reasons.join(" ")).toMatch(/risk: high/);
  });

  it("escalates a change to the kit", () => {
    const result = classify([modified("kit/blocks/refunds.ts", "a", "b")], rules);

    expect(result.decision).toBe("ESCALATE");
    expect(result.reasons.join(" ")).toMatch(/outside apps\//);
  });

  it("escalates role and sensitivity changes on an existing app", () => {
    const roleChange = classify(
      [
        modified(
          "apps/feature-flags.yaml",
          flagsApp,
          flagsApp.replace("admin: [platform-eng]", "admin: [ops-leads]"),
        ),
      ],
      rules,
    );
    const sensitivityChange = classify(
      [
        modified(
          "apps/refunds.yaml",
          refundsApp,
          refundsApp.replace("show_sensitive_to: [approver]", "show_sensitive_to: [analyst, approver]"),
        ),
      ],
      rules,
    );

    expect(roleChange.reasons.join(" ")).toMatch(/Roles changed/);
    expect(sensitivityChange.reasons.join(" ")).toMatch(/show_sensitive_to/);
  });

  it("escalates a deleted app and a non-YAML file under apps/", () => {
    expect(
      classify([{ status: "D", path: "apps/refunds.yaml", base: refundsApp }], rules).reasons.join(" "),
    ).toMatch(/deleted or renamed/);
    expect(classify([added("apps/notes.txt", "hello")], rules).reasons.join(" ")).toMatch(
      /non-YAML/,
    );
  });

  it("escalates config that does not validate", () => {
    const result = classify([added("apps/broken.yaml", "name: Broken\nowner: x\n")], rules);

    expect(result.reasons.join(" ")).toMatch(/fails validation/);
  });

  it("ignores formatting-only changes", () => {
    const reformatted = flagsApp.replace("roles:\n  admin: [platform-eng]", "roles:\n  admin:\n    - platform-eng");

    expect(classify([modified("apps/feature-flags.yaml", flagsApp, reformatted)], rules).decision).toBe(
      "SELF-SERVE",
    );
  });
});
