import { mkdir, readFile, writeFile, readdir, rename } from "node:fs/promises";

import * as mitosis from "@builder.io/mitosis";

import { frameworks } from "../frameworks.ts";
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
  const directory = `generated/${framework.id}`;
  await mkdir(directory, { recursive: true });
  for (const file of files) {
    const component = mitosis.parseJsx(await readFile(`src/components/${file}`, "utf8"));
    const generate = mitosis[framework.generator] as (
      options: object,
    ) => (input: { component: typeof component }) => string;
    let output = generate({ ...framework.options, typescript: false })({ component });
    output = output.replaceAll(/(["'])\.\/([\w-]+)\.lite\1/g, `$1./$2.${framework.extension}$1`);
    if (framework.extension === "jsx")
      output = `/** @jsxImportSource ${framework.jsxImportSource} */\n` + output;
    await writeGenerated(`${directory}/${file.replace("lite.tsx", framework.extension)}`, output);
  }
  for (const library of libraries) {
    const name = library.entry.slice(1) || "index";
    await writeGenerated(
      `${directory}/${name}.ts`,
      `// Generated from the framework and datetime registries.\nimport { configureNeodt, type NeodtProps as GenericProps } from "../../frameworks/${framework.id}/generic";\nimport { adapter } from "../../${library.source.replace(/\.ts$/, "")}";\nimport type { DateAdapter } from "../../src/adapter";\ntype Value = typeof adapter extends DateAdapter<infer T, infer _Z> ? T : never;\ntype Zone = typeof adapter extends DateAdapter<infer _T, infer Z> ? Z : never;\nexport type NeodtProps = Omit<GenericProps<Value, Zone>, "adapter">;\nexport const Neodt = configureNeodt(adapter);\nexport default Neodt;\nexport * from "../../${library.source.replace(/\.ts$/, "")}";\n`,
    );
  }
}
