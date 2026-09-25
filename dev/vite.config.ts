import path from "node:path";

import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

import { frameworks } from "../frameworks";
import { checkLibraryEntries } from "./build-library-check";
import { hydrationFixture } from "./hydration-plugin";
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
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
}));
