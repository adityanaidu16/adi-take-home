import fs from "node:fs";
import path from "node:path";
import { APPS_DIR, parseAppConfig } from "@/kit/config/loader";
import { lintApps } from "@/kit/sandbox";

const entries = fs.existsSync(APPS_DIR)
  ? fs.readdirSync(APPS_DIR, { withFileTypes: true })
  : [];
const errors: string[] = [];
let configs = 0;

for (const entry of entries) {
  if (entry.isDirectory()) {
    // An app may own a presentation folder: apps/<slug>/dashboard.tsx, and
    // nothing else. Its governance still lives in apps/<slug>.yaml.
    const yaml = ["yaml", "yml"].some((ext) => fs.existsSync(path.join(APPS_DIR, `${entry.name}.${ext}`)));
    if (!yaml) errors.push(`apps/${entry.name}/: no apps/${entry.name}.yaml to go with it`);
    for (const file of fs.readdirSync(path.join(APPS_DIR, entry.name))) {
      if (file !== "dashboard.tsx") {
        errors.push(`apps/${entry.name}/${file}: only dashboard.tsx belongs in an app folder`);
      }
    }
    continue;
  }

  const file = entry.name;
  if (!file.endsWith(".yaml") && !file.endsWith(".yml")) {
    errors.push(`apps/${file}: only .yaml files belong in apps/`);
    continue;
  }
  configs += 1;
  try {
    parseAppConfig(fs.readFileSync(path.join(APPS_DIR, file), "utf8"), `apps/${file}`);
    console.log(`ok  apps/${file}`);
  } catch (err) {
    errors.push((err as Error).message);
  }
}

// Dashboards are checked against the sandbox: presentation only, data and
// actions through the kit client API.
lintApps(APPS_DIR).then((linted) => {
  for (const [file, violations] of Object.entries(linted)) {
    if (violations.length === 0) {
      console.log(`ok  ${file} (sandboxed)`);
      continue;
    }
    for (const violation of violations) {
      errors.push(`${file}:${violation.line}: ${violation.message} [${violation.rule}]`);
    }
  }

  if (errors.length > 0) {
    console.error("\nInvalid app configuration:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(
    `\n${configs} app config(s) valid, ${Object.keys(linted).length} dashboard(s) within the sandbox.`,
  );
});
