import { execFileSync } from "node:child_process";

import { frameworks } from "../frameworks.ts";
for (const config of [
  "tsconfig.json",
  "src/components/tsconfig.json",
  ...frameworks.map(({ id }) => `frameworks/${id}/tsconfig.json`),
]) {
  execFileSync("node_modules/.bin/tsc", ["--noEmit", "-p", config], { stdio: "inherit" });
}

execFileSync(
  "node_modules/.bin/svelte-check",
  ["--tsconfig", "frameworks/svelte/tsconfig.json", "--threshold", "error"],
  { stdio: "inherit" },
);
