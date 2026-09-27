import { describe, expect, it } from "vitest";
import { approve, parseApprover, type Owners } from "@/review/approve";
import type { ChangedFile } from "@/review/classify";

const owners: Owners = {
  "platform-eng": [{ name: "Jordan Lee", slack: "U02JORDAN", github: "jordan-plat" }],
  "payments-ops": [{ name: "Maria Alvarez", slack: "U01MARIA", github: "maria-ops" }],
};

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

const withApproval = `${flagsApp}    approval:
      when: { field: environment, equals: production }
      approver_roles: [admin]
`;

function added(path: string, head: string): ChangedFile {
  return { status: "A", path, head };
}

describe("confirmation from chat", () => {
  it("accepts a confirmation from the owning team", () => {
    const result = approve(
      [added("apps/feature-flags.yaml", flagsApp)],
      owners,
      { kind: "slack", handle: "U02JORDAN" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.approvedBy).toBe("Jordan Lee");
  });

  it("refuses a confirmation from outside the owning team", () => {
    const result = approve(
      [added("apps/feature-flags.yaml", flagsApp)],
      owners,
      { kind: "slack", handle: "U01MARIA" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/not in "platform-eng"/);
  });

  it("refuses an unknown handle even if it looks like a team member", () => {
    expect(
      approve([added("apps/feature-flags.yaml", flagsApp)], owners, {
        kind: "github",
        handle: "U02JORDAN",
      }).ok,
    ).toBe(false);
  });

  it("refuses to confirm an escalated change, however senior the confirmer", () => {
    const result = approve(
      [{ status: "M", path: "apps/feature-flags.yaml", base: flagsApp, head: withApproval }],
      owners,
      { kind: "slack", handle: "U02JORDAN" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/needs an engineer/);
  });

  it("refuses a change that hands the app to the confirmer's own team", () => {
    const reassigned = flagsApp.replace("owner: platform-eng", "owner: payments-ops");
    const result = approve(
      [{ status: "M", path: "apps/feature-flags.yaml", base: flagsApp, head: reassigned }],
      owners,
      { kind: "slack", handle: "U01MARIA" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/changes owner away from "platform-eng"/);
  });

  it("asks the owner on the base branch, not the one the change proposes", () => {
    const reassigned = flagsApp.replace("owner: platform-eng", "owner: payments-ops");
    const result = approve(
      [{ status: "M", path: "apps/feature-flags.yaml", base: flagsApp, head: reassigned }],
      owners,
      { kind: "slack", handle: "U02JORDAN" },
    );

    expect(result.ok).toBe(false);
  });

  it("refuses when the change touches the kit as well as an app", () => {
    expect(
      approve(
        [added("apps/feature-flags.yaml", flagsApp), added("kit/blocks/evil.ts", "x")],
        owners,
        { kind: "slack", handle: "U02JORDAN" },
      ).ok,
    ).toBe(false);
  });

  it("reads approver handles, and rejects malformed ones", () => {
    expect(parseApprover("slack:@U01MARIA")).toEqual({ kind: "slack", handle: "U01MARIA" });
    expect(parseApprover("github:maria-ops")).toEqual({ kind: "github", handle: "maria-ops" });
    expect(parseApprover("email:maria@example.com")).toBeNull();
    expect(parseApprover("U01MARIA")).toBeNull();
  });
});
