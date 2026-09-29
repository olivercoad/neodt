import { defineConfig } from "tsdown";

import { frameworks, frameworkPackages } from "./frameworks.ts";
import { loadFrameworkTooling } from "./frameworks/tooling.ts";
import { libraries, datetimePackages } from "./libraries.ts";
import { libraryEntries } from "./scripts/library-entries.ts";

export default defineConfig(
  await Promise.all(
    frameworks.map(async (framework) => {
      const { build: integration } = await loadFrameworkTooling(framework.id);
      return {
        ...integration,
        entry: Object.fromEntries([
          ...Object.entries(integration.entry ?? {}),
          ["generic", `frameworks/${framework.id}/generic.${framework.sourceExtension}`],
          ...libraries.map((library) => [
            library.entry.slice(1) || "index",
            `generated/${framework.id}/${library.entry.slice(1) || "index"}.ts`,
          ]),
        ]),
        outDir: `dist/${framework.id}`,
        // Keep UI/CSS modules separate from parsers and adapter factories so
        // consumers can discard them before framework compilation/minification.
        unbundle: true,
        outputOptions: {
          // npm excludes node_modules even inside dist. Vanilla's bundled
          // lit-html implementation must remain part of the published tarball.
          entryFileNames: (chunk: { name: string }) =>
            `${chunk.name.replaceAll("node_modules", "vendor").replaceAll(".pnpm", "packages").replaceAll("?", "_")}.${framework.outputExtension}`,
        },
        tsconfig: "tsconfig.build.json",
        plugins: [
          libraryEntries(),
          {
            name: "external-styles",
            resolveId(id: string) {
              // Public generic entries live at the root of each framework output.
              if (!["vanilla", "lit"].includes(framework.id) && id.endsWith("/src/styles.css"))
                return { id: "./style.css", external: true };
            },
          },
          integration.plugins,
        ],
        platform: "neutral" as const,
        deps: { ...integration.deps, neverBundle: [...datetimePackages, ...frameworkPackages] },
        css: { inject: true },
        exports: false,
        dts: { compilerOptions: { rootDir: process.cwd() } },
      };
    }),
  ),
);
