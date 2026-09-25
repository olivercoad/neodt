import type { Plugin } from "vite";

import { frameworks } from "../frameworks";
import { libraries } from "./libraries";

const packages = Object.fromEntries(
  libraries.map((library) => [library.id, [...library.dependencies, ...library.demoPackages]]),
);

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
        const framework = chunk.facadeModuleId?.endsWith("/dev/index.html")
          ? frameworks.find(({ id }) => id === "solid")
          : frameworks.find(({ id }) =>
              chunk.facadeModuleId?.endsWith(`/${id}/${library.id}/index.html`),
            );
        if (!framework) this.error(`Missing framework for ${chunk.facadeModuleId}`);
        const entry = `${framework.id}/${library.id}`;
        checked.add(entry);
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
              `${entry} entry ${loaded ? "loads unselected" : "does not load selected"} library ${id}`,
            );
          }
        }
        for (const { id } of frameworks) {
          // The documentation shell uses Solid; the control must use only the selected binding.
          const loaded = [...modules].some(
            (module) =>
              module.includes(`/generated/${id}/`) || module.includes(`/frameworks/${id}/generic.`),
          );
          if (loaded !== (id === framework.id)) {
            this.error(
              `${entry} entry ${loaded ? "loads unselected" : "does not load selected"} framework ${id}`,
            );
          }
        }
      }
      for (const framework of frameworks)
        for (const library of libraries) {
          const entry = `${framework.id}/${library.id}`;
          if (!checked.has(entry)) this.error(`Missing production entry for ${entry}`);
        }
    },
  };
}
