import path from "node:path";

import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

import { frameworks } from "../frameworks";
import { checkLibraryEntries } from "./build-library-check";
import { hydrationFixture } from "./hydration-plugin";
import { libraries } from "./libraries";
import { libraryPages } from "./library-plugin";

export default defineConfig(async () => ({
  resolve: {
    alias: {
      src: path.resolve(import.meta.dirname, "../src"),
    },
  },
  plugins: [
    hydrationFixture(),
    libraryPages(),
    solidPlugin({ include: ["**/dev/**"] }),
    ...(
      await Promise.all(
        frameworks.map(async (framework) =>
          (
            await import(
              path.resolve(import.meta.dirname, "..", "frameworks", framework.id, "vite.ts")
            )
          ).plugins(),
        ),
      )
    ).flat(),
    checkLibraryEntries(),
  ],
  optimizeDeps: {
    entries: [
      path.resolve(import.meta.dirname, "start.tsx"),
      ...libraries.map(({ source }) => path.resolve(import.meta.dirname, "..", source)),
    ],
  },
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: Object.fromEntries([
        ["index", path.resolve(import.meta.dirname, "index.html")],
        ...frameworks.flatMap((framework) =>
          libraries.map(({ id }) => [
            `${framework.id}/${id}`,
            path.resolve(import.meta.dirname, framework.id, id, "index.html"),
          ]),
        ),
      ]),
    },
  },
}));
