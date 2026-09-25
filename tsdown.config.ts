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
        tsconfig: "tsconfig.build.json",
        plugins: [libraryEntries(), integration.plugins],
        platform: "neutral" as const,
        deps: { ...integration.deps, neverBundle: [...datetimePackages, ...frameworkPackages] },
        css: { inject: true },
        exports: false,
        dts: { compilerOptions: { rootDir: process.cwd() } },
      };
    }),
  ),
);
