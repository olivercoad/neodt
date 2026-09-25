import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import type { Plugin, PluginOption } from "vite";

import { frameworks } from "../frameworks.ts";
import { loadFrameworkTooling, type ToolingMode } from "../frameworks/tooling.ts";

/** Shared compiler setup and generated-component lifecycle for Vite and Vitest. */
export async function frameworkPlugins(
  mode: Exclude<ToolingMode, "consumer"> = "development",
): Promise<PluginOption[]> {
  const root = path.resolve(import.meta.dirname, "..");
  const components = path.join(root, "src/components");
  const generate = () =>
    promisify(execFile)(process.execPath, [path.join(root, "scripts/generate.ts")], { cwd: root });
  const generation: Plugin = {
    name: "framework-components",
    enforce: "pre",
    async config() {
      // Run before import scanning, including on a fresh checkout.
      await generate();
    },
    configureServer(server) {
      server.watcher.add(components);
    },
    async handleHotUpdate(context) {
      if (!context.file.startsWith(components + path.sep) || !context.file.endsWith(".lite.tsx"))
        return;
      await generate();
      context.server.ws.send({ type: "full-reload" });
      return [];
    },
  };
  return [
    generation,
    ...(
      await Promise.all(
        frameworks.map(async ({ id }) => (await loadFrameworkTooling(id)).plugins(mode)),
      )
    ).flat(),
  ];
}
