import path from "node:path";

import type { Plugin } from "vite";

import { frameworks } from "../frameworks";
/** Development-only fixture: hydrate markup produced by each framework's actual server renderer. */
export function hydrationFixture(): Plugin {
  return {
    name: "hydration-fixture",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://fixture");
        const framework = frameworks.find(({ id }) => url.pathname === `/@neodt/hydration/${id}`);
        if (!framework) return next();
        try {
          const source = `/frameworks/${framework.id}/test.${framework.sourceExtension}`;
          const [host, library] = await Promise.all([
            server.ssrLoadModule(path.resolve(server.config.root, "..", source.slice(1))),
            server.ssrLoadModule(
              path.resolve(server.config.root, "../src/libraries/temporal-polyfill.ts"),
            ),
          ]);
          const referenceTime = library.adapter.fromEpochMilliseconds(1786980600000, "UTC");
          const html = await host.renderServer({
            adapter: library.adapter,
            referenceTime,
            value: referenceTime,
            locale: "en-GB",
          });
          const page = `<!doctype html><html><head>${host.hydrationScript?.() ?? ""}<title>Hydration fixture</title></head><body><div id="root">${html}</div>
<script type="module">
import { mount } from "/@fs${server.config.root}/..${source}";
import { adapter } from "/@fs${server.config.root}/../src/libraries/temporal-polyfill.ts";
const referenceTime = adapter.fromEpochMilliseconds(1786980600000, "UTC");
const original = document.querySelector('[role="spinbutton"]');
window.IS_REACT_ACT_ENVIRONMENT = true;
window.changes = 0;
const instance = await mount(document.getElementById("root"), { adapter, referenceTime, value: referenceTime, locale: "en-GB", onValueChange: () => { window.changes++; } }, true);
window.hydrationPreservedNode = original === document.querySelector('[role="spinbutton"]');
window.fixtureDispose = instance.dispose;
document.documentElement.dataset.hydrated = "true";
</script></body></html>`;
          response.setHeader("Content-Type", "text/html");
          response.end(await server.transformIndexHtml(url.pathname, page));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
