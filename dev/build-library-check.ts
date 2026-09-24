import type { Plugin } from "vite";

import { libraries } from "./libraries";

const packages: Record<string, string[]> = {
  "native-temporal": [],
  "temporal-polyfill": ["temporal-polyfill"],
  "js-temporal-polyfill": ["@js-temporal/polyfill"],
  luxon: ["luxon"],
  moment: ["moment", "moment-timezone"],
  dayjs: ["dayjs"],
  "date-fns": ["date-fns", "@date-fns/tz"],
  spacetime: ["spacetime"],
  "internationalized-date": ["@internationalized/date"],
};

/** Check the actual production graph, including shared and dynamically imported chunks. */
export function checkLibraryEntries(): Plugin {
  return {
    name: "check-library-entries",
    generateBundle(_options, bundle) {
      const checked = new Set<string>();
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk" || !chunk.isEntry) continue;
        const library =
          libraries.find(({ id }) => chunk.facadeModuleId?.endsWith(`/${id}/index.html`)) ??
          (chunk.facadeModuleId?.endsWith("/dev/index.html")
            ? libraries.find(({ id }) => id === "temporal-polyfill")
            : undefined);
        if (!library) continue;
        checked.add(library.id);
        const visited = new Set<string>();
        const modules = new Set<string>();
        const visit = (file: string) => {
          if (visited.has(file)) return;
          visited.add(file);
          const dependency = bundle[file];
          if (dependency?.type !== "chunk") return;
          for (const id of Object.keys(dependency.modules)) modules.add(id.replaceAll("\\", "/"));
          for (const imported of [...dependency.imports, ...dependency.dynamicImports])
            visit(imported);
        };
        visit(chunk.fileName);
        for (const [id, names] of Object.entries(packages)) {
          const loaded = [...modules].some((module) =>
            names.some((name) => module.includes(`/node_modules/${name}/`)),
          );
          if (names.length && loaded !== (id === library.id)) {
            this.error(
              `${library.id} entry ${loaded ? "loads unselected" : "does not load selected"} library ${id}`,
            );
          }
        }
      }
      for (const { id } of libraries) {
        if (!checked.has(id)) this.error(`Missing production entry for ${id}`);
      }
    },
  };
}
