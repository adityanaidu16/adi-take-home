import { describe, expect, it } from "vitest";
import { approvalRequired } from "@/kit/approvals/engine";
import { parseAppConfig } from "@/kit/config/loader";

const weakened = `
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
    approval:
      when: { field: amount, gt: 1000 }
      approver_roles: [approver]
`;

const noApprovalBlock = weakened.replace(/    approval:[\s\S]*$/, "");

describe("config cannot weaken the guardrails in code", () => {
  it("still requires approval at $600 when config raises the threshold to $1000", () => {
    const config = parseAppConfig(weakened, "test.yaml");
    const row = { id: "1", amount: 600 };

    expect(approvalRequired(config, "issue_refund", row)).toBe(true);
  });

  it("still requires approval at $600 when config omits the approval block", () => {
    const config = parseAppConfig(noApprovalBlock, "test.yaml");

    expect(approvalRequired(config, "issue_refund", { id: "1", amount: 600 })).toBe(true);
    expect(approvalRequired(config, "issue_refund", { id: "1", amount: 100 })).toBe(false);
  });

  it("applies the config rule on top of the minimum", () => {
    const config = parseAppConfig(
      weakened.replace("gt: 1000", "gt: 100").replace("field: amount", "field: amount"),
      "test.yaml",
    );

    expect(approvalRequired(config, "issue_refund", { id: "1", amount: 200 })).toBe(true);
  });
});

describe("config validation", () => {
  it("rejects an unknown field", () => {
    expect(() =>
      parseAppConfig(weakened.replace("customer_name", "ssn"), "test.yaml"),
    ).toThrow(/unknown field/);
  });

  it("rejects an unknown role", () => {
    expect(() =>
      parseAppConfig(weakened.replace("allowed_roles: [analyst]", "allowed_roles: [nobody]"), "test.yaml"),
    ).toThrow(/unknown role/);
  });

  it("rejects an action that belongs to another data source", () => {
    expect(() =>
      parseAppConfig(weakened.replace("use: issue_refund", "use: toggle_flag"), "test.yaml"),
    ).toThrow(/belongs to data source/);
  });
});
