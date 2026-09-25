import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Plugin } from "vite";

import { frameworks } from "../frameworks";
import { libraries } from "../libraries";

/** One HTML template and a virtual startup module for each registered library. */
export function libraryPages(): Plugin {
  const root = import.meta.dirname;
  const pages = new Map(
    frameworks.flatMap((framework) =>
      libraries.map(
        (library) =>
          [
            path.join(root, framework.id, library.id, "index.html"),
            { library, framework },
          ] as const,
      ),
    ),
  );
  const defaultLibrary = libraries.find(({ id }) => id === "native-temporal")!;
  const script = (id: string) => `<script type="module" src="/@neodt/demo/${id}.ts"></script>`;
  const html = async (id: string) =>
    (await readFile(path.join(root, "index.html"), "utf8")).replace(
      "<!-- library-entry -->",
      script(id),
    );
  return {
    name: "library-pages",
    enforce: "pre",
    config() {
      return {
        optimizeDeps: {
          entries: [
            path.join(root, "start.tsx"),
            ...libraries.map(({ source }) => path.resolve(root, "..", source)),
          ],
        },
        build: {
          rollupOptions: {
            input: Object.fromEntries([
              ["index", path.join(root, "index.html")],
              ...Array.from(pages, ([file, { framework, library }]) => [
                `${framework.id}/${library.id}`,
                file,
              ]),
            ]),
          },
        },
      };
    },
    resolveId(id) {
      if (id.startsWith("/@neodt/demo/")) return `\0${id}`;
      if (pages.has(id)) return id;
    },
    async load(id) {
      const page = pages.get(id);
      if (page) return html(`${page.framework.id}/${page.library.id}`);
      if (!id.startsWith("\0/@neodt/demo/")) return;
      const [frameworkId, name] = id.slice("\0/@neodt/demo/".length, -3).split("/");
      const framework = frameworks.find(({ id }) => id === frameworkId);
      if (!framework) return this.error(`Unknown framework: ${frameworkId}`);
      const library = libraries.find((library) => library.id === name);
      if (!library) return this.error(`Unknown datetime library: ${name}`);
      // The shell uses Solid directly; other frameworks only supply native mounting operations.
      const directory = path.resolve(root, "..", "frameworks", framework.id);
      const control =
        framework.id === "solid"
          ? `import { Neodt as Control } from ${JSON.stringify(path.join(directory, `generic.${framework.sourceExtension}`))};`
          : `import { mount } from ${JSON.stringify(path.join(directory, "demo.ts"))};
import { frameworkHost } from ${JSON.stringify(path.join(root, "framework-host.tsx"))};
const Control = frameworkHost(mount);`;
      return `${name === "native-temporal" ? 'import "temporal-polyfill/global";' : ""}
${control}
import { integration } from ${JSON.stringify(path.resolve(root, "..", library.source))};
import { start } from ${JSON.stringify(path.join(root, "start.tsx"))};
await integration.setup();
integration.run(({ adapter, zone }) => start(${JSON.stringify(name)}, adapter, zone, ${JSON.stringify(framework.id)}, Control));`;
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace("<!-- library-entry -->", script(`vanilla/${defaultLibrary.id}`));
      },
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        const segments = url.pathname.split("/").filter(Boolean);
        const framework = frameworks.find(({ id }) => id === segments[0]);
        const library = libraries.find(({ id }) => id === (framework ? segments[1] : segments[0]));
        if (!library) return next();
        const pagePath = `/${framework?.id ?? "vanilla"}/${library.id}/`;
        if (url.pathname !== pagePath && url.pathname !== pagePath + "index.html") {
          response.writeHead(302, { Location: pagePath + url.search });
          response.end();
          return;
        }
        try {
          const transformed = await server.transformIndexHtml(
            url.pathname,
            await html(`${framework?.id ?? "vanilla"}/${library.id}`),
          );
          response.setHeader("Content-Type", "text/html");
          response.end(transformed);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
