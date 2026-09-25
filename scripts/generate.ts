import { mkdir, readFile, writeFile, readdir, rename } from "node:fs/promises";

import * as mitosis from "@builder.io/mitosis";

import { frameworks } from "../frameworks.ts";
import { loadFrameworkTooling } from "../frameworks/tooling.ts";
import { libraries } from "../libraries.ts";

// Replace complete files atomically so a running dev server never observes missing/partial modules.
async function writeGenerated(file: string, content: string) {
  const previous = await readFile(file, "utf8").catch(() => undefined);
  if (previous === content) return;
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, file);
}
const files = (await readdir("src/components")).filter((file) => file.endsWith(".lite.tsx"));
for (const framework of frameworks) {
  const { transformGenerated, generateComponent } = await loadFrameworkTooling(framework.id);
  const directory = `generated/${framework.id}`;
  await mkdir(directory, { recursive: true });
  for (const file of files) {
    const component = mitosis.parseJsx(await readFile(`src/components/${file}`, "utf8"));
    const generate = mitosis[framework.generator] as (
      options: object,
    ) => (input: { component: typeof component }) => string;
    let output = generateComponent
      ? generateComponent(component)
      : generate({ typescript: false, ...framework.options })({
          component,
        });
    output = output.replaceAll(/(["'])\.\/([\w-]+)\.lite\1/g, `$1./$2.${framework.extension}$1`);
    if (framework.extension === "jsx")
      output = `/** @jsxImportSource ${framework.jsxImportSource} */\n` + output;
    await writeGenerated(
      `${directory}/${file.replace("lite.tsx", framework.extension)}`,
      transformGenerated(output),
    );
  }
  for (const library of libraries) {
    const name = library.entry.slice(1) || "index";
    await writeGenerated(
      `${directory}/${name}.ts`,
      `// Generated from the framework and datetime registries.
import { configureNeodt, type NeodtProps as GenericProps } from "../../frameworks/${framework.id}/generic";
import { adapter } from "../../${library.source.replace(/\.ts$/, "")}";
import type { DateAdapter } from "../../src/adapter";
import { configureDate, type ConfiguredNaturalDateParseOptions } from "../../src/configured";
type Value = typeof adapter extends DateAdapter<infer T, infer _Z> ? T : never;
type Zone = typeof adapter extends DateAdapter<infer _T, infer Z> ? Z : never;
export type NeodtProps = Omit<GenericProps<Value, Zone>, "adapter">;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Value, Zone>;
export const { parseNaturalDate } = configureDate(adapter);
export * from "../../src/public";
export const Neodt = configureNeodt(adapter);
export default Neodt;
export * from "../../${library.source.replace(/\.ts$/, "")}";
`,
    );
  }
}
