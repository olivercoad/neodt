import { defineConfig } from "tsdown";

import { frameworks, frameworkPackages } from "./frameworks.ts";
import { libraries, datetimePackages } from "./libraries.ts";
import { libraryEntries } from "./scripts/library-entries.ts";

export default defineConfig(
  await Promise.all(
    frameworks.map(async (framework) => {
      const { default: integration } = await import(`./frameworks/${framework.id}/build.ts`);
      return {
        ...integration,
        entry: Object.fromEntries([
          ["generic", `frameworks/${framework.id}/generic.${framework.sourceExtension}`],
          ...libraries.map((library) => [
            library.entry.slice(1) || "index",
            `generated/${framework.id}/${library.entry.slice(1) || "index"}.ts`,
          ]),
        ]),
        outDir: `dist/${framework.id}`,
        tsconfig: "tsconfig.build.json",
        plugins: [libraryEntries(), ...(integration.plugins ?? [])],
        platform: "neutral" as const,
        deps: { neverBundle: [...datetimePackages, ...frameworkPackages] },
        css: { inject: true },
        exports: false,
        dts: { compilerOptions: { rootDir: process.cwd() } },
      };
    }),
  ),
);
