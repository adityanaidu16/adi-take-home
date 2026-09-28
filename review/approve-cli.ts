import { changesAgainst, withSandboxLint } from "./classify";
import { approve, loadOwners, parseApprover } from "./approve";

const args = process.argv.slice(2);
const valueOf = (flag: string) => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
};

const raw = valueOf("--by");
const approver = raw ? parseApprover(raw) : null;
if (!approver) {
  console.error("Usage: npm run approve -- --by slack:U01MARIA [--base main]");
  process.exit(2);
}

const changes = await withSandboxLint(changesAgainst(valueOf("--base") ?? "main"));
const result = approve(changes, loadOwners(), approver);

if (!result.ok) {
  console.error(`REFUSED: ${result.reason}`);
  process.exit(1);
}

console.log("CONFIRMED by the owning team. Safe to merge.");
console.log(JSON.stringify(result.record, null, 2));
