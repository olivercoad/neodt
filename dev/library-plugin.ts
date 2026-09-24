import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Plugin } from "vite";

import { libraries } from "../libraries";

/** One HTML template and a virtual startup module for each registered library. */
export function libraryPages(): Plugin {
  const root = import.meta.dirname;
  const pages = new Map(
    libraries.map((library) => [path.join(root, library.id, "index.html"), library]),
  );
  const defaultLibrary = libraries.find(({ id }) => id === "temporal-polyfill")!;
  const script = (id: string) => `<script type="module" src="/@neodt/demo/${id}.ts"></script>`;
  const html = async (id: string) =>
    (await readFile(path.join(root, "index.html"), "utf8")).replace(
      "<!-- library-entry -->",
      script(id),
    );
  return {
    name: "library-pages",
    enforce: "pre",
    resolveId(id) {
      if (id.startsWith("/@neodt/demo/")) return `\0${id}`;
      if (pages.has(id)) return id;
    },
    async load(id) {
      const page = pages.get(id);
      if (page) return html(page.id);
      if (!id.startsWith("\0/@neodt/demo/")) return;
      const name = id.slice("\0/@neodt/demo/".length, -3);
      const library = libraries.find((library) => library.id === name);
      if (!library) return this.error(`Unknown datetime library: ${name}`);
      return `import { integration } from ${JSON.stringify(path.resolve(root, "..", library.source))};
import { start, nativeUnavailable } from ${JSON.stringify(path.join(root, "start.tsx"))};
${name === "native-temporal" ? 'if (typeof Temporal === "undefined") nativeUnavailable(); else' : ""} {
  await integration.setup();
  integration.run(({ adapter, zone }) => start(${JSON.stringify(name)}, adapter, zone));
}`;
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace("<!-- library-entry -->", script(defaultLibrary.id));
      },
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        const library = libraries.find(({ id }) =>
          [`/${id}`, `/${id}/`, `/${id}/index.html`].includes(url.pathname),
        );
        if (!library) return next();
        if (url.pathname === `/${library.id}`) {
          response.writeHead(302, { Location: `/${library.id}/${url.search}` });
          response.end();
          return;
        }
        try {
          const transformed = await server.transformIndexHtml(url.pathname, await html(library.id));
          response.setHeader("Content-Type", "text/html");
          response.end(transformed);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
