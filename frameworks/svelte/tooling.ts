import { cp, readdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import { svelte } from "@sveltejs/vite-plugin-svelte";

import type { FrameworkTooling } from "../tooling.ts";
export default {
  transformGenerated: (source) => source.replaceAll(/<span([^>]*?)\s*\/>/gs, "<span$1></span>"),
  plugins: () => [
    svelte({
      configFile: false,
      onwarn(warning, handler) {
        if (!warning.code.startsWith("a11y_") && warning.code !== "non_reactive_update")
          handler(warning);
      },
    }),
  ],
  build: {
    entry: { binding: "src/core/binding.ts", controller: "src/core/controller.ts" },
    plugins: [
      {
        name: "svelte-components",
        resolveId(id) {
          if (id.endsWith(".svelte")) return { id: `./${path.basename(id)}`, external: true };
        },
      },
    ],
    hooks: {
      "build:done": async () => {
        for (const file of await readdir("generated/svelte"))
          if (file.endsWith(".svelte")) await cp(`generated/svelte/${file}`, `dist/svelte/${file}`);
        let source = await readFile("frameworks/svelte/Neodt.svelte", "utf8");
        source = source
          .replace("../../generated/svelte/Control.svelte", "./Control.svelte")
          .replace("../../src/core/binding", "./binding.js")
          .replace("../../src/core/controller", "./controller.js");
        await writeFile("dist/svelte/Neodt.svelte", source);
        await writeFile(
          "dist/svelte/Neodt.svelte.d.ts",
          'import type { NeodtComponent } from "./generic.js";\ndeclare const Neodt: NeodtComponent;\nexport default Neodt;\n',
        );
      },
    },
  },
  consumer: {
    compilerArgs: (directory) => [
      "--tsconfig",
      path.join(directory, "tsconfig.json"),
      "--threshold",
      "error",
      "--config",
      path.resolve(import.meta.dirname, "../../svelte.config.js"),
    ],
    compiler: "svelte-check",
    extension: "svelte",
    wrap: (script) => `<script lang="ts">\n${script.replaceAll("export const", "const")}`,
    render: (generic, callback) => `
// @ts-expect-error Mixed datetime values must be rejected by the component's props.
const invalidValue: import("svelte").ComponentProps<typeof Neodt${generic ? "<typeof referenceTime, typeof adapter extends import('@olicoad/neodt/svelte/generic').DateAdapter<infer _T, infer Z> ? Z : never>" : ""}> = { ${generic ? "adapter," : ""} referenceTime, value: "invalid" };
</script>\n<Neodt ${generic ? "{adapter}" : ""} {referenceTime} onValueChange={value => { ${callback}; }} />`,
  },
} satisfies FrameworkTooling;
