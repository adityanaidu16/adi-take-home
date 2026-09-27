import fs from "node:fs";
import path from "node:path";
import { APPS_DIR, parseAppConfig } from "@/kit/config/loader";

const files = fs.existsSync(APPS_DIR) ? fs.readdirSync(APPS_DIR) : [];
const errors: string[] = [];

for (const file of files) {
  if (!file.endsWith(".yaml") && !file.endsWith(".yml")) {
    errors.push(`apps/${file}: only .yaml files belong in apps/`);
    continue;
  }
  try {
    parseAppConfig(fs.readFileSync(path.join(APPS_DIR, file), "utf8"), `apps/${file}`);
    console.log(`ok  apps/${file}`);
  } catch (err) {
    errors.push((err as Error).message);
  }
}

if (errors.length > 0) {
  console.error("\nInvalid app configuration:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`\n${files.length} app config(s) valid.`);
