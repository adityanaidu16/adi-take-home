import fs from "node:fs";
import path from "node:path";

// Tests run against the same local services as `npm run dev`.
const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^"(.*)"$/, "$1");
    process.env[match[1]] ??= value;
  }
}

process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-bytes-long";
