import { changesAgainst, classify, loadRules } from "./classify";

const baseFlag = process.argv.indexOf("--base");
const base = baseFlag === -1 ? "main" : process.argv[baseFlag + 1];

const changes = changesAgainst(base);
const result = classify(changes, loadRules());

console.log(`Changed files (vs ${base}):`);
for (const change of changes) console.log(`  ${change.status} ${change.path}`);
console.log();

if (result.decision === "SELF-SERVE") {
  console.log("SELF-SERVE");
  console.log("Config-only change within the guardrails. No engineering review required.");
} else {
  console.log("ESCALATE: engineering review");
  for (const reason of result.reasons) console.log(`  - ${reason}`);
}
