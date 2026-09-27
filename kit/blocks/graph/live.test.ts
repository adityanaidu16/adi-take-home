/**
 * Integration tests against a real Microsoft 365 tenant. Skipped unless
 * LIVE_GRAPH=1 and real GRAPH_* credentials are set: `npm run test:live`.
 *
 * These have never been run against a real tenant. See the README.
 */
import { describe, expect, it } from "vitest";
import { refundExceptions } from "./index";

const live = process.env.LIVE_GRAPH === "1";

describe.skipIf(!live)("Microsoft Graph (live tenant)", () => {
  it("reads the registered refund exceptions list", async () => {
    const rows = await refundExceptions.read();
    expect(Array.isArray(rows)).toBe(true);
  });
});
