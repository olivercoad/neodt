import path from "node:path";

import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

import { checkLibraryEntries } from "./build-library-check.ts";
import { frameworkPlugins } from "./framework-plugin.ts";
import { hydrationFixture } from "./hydration-plugin.ts";
import { libraryPages } from "./library-plugin.ts";

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
    ...(await frameworkPlugins()),
    checkLibraryEntries(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
}));
