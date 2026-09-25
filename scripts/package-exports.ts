import { readFile, writeFile, mkdir, cp } from "node:fs/promises";

import { frameworks } from "../frameworks.ts";
import { libraries } from "../libraries.ts";
const original = await readFile("package.json", "utf8");
const pkg = JSON.parse(original);
pkg.exports = Object.fromEntries(
  frameworks.flatMap((framework) =>
    [
      ["", "index"],
      ["/generic", "generic"],
      ...libraries
        .filter((library) => library.entry)
        .map((library) => [library.entry, library.entry.slice(1)]),
    ].map(([suffix, name]) => [
      `./${framework.id}${suffix}`,
      {
        types: `./dist/${framework.id}/${name}.d.ts`,
        default: `./dist/${framework.id}/${name}.${framework.outputExtension}`,
      },
    ]),
  ),
);
pkg.exports["./package.json"] = "./package.json";
pkg.exports["./style.css"] = "./dist/style.css";
const next = JSON.stringify(pkg, null, 2) + "\n";
if (original !== next) await writeFile("package.json", next);
await mkdir("dist", { recursive: true });
await cp("src/styles.css", "dist/style.css");
