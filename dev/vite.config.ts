import path from "node:path";

import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

import { checkLibraryEntries } from "./build-library-check";
import { frameworkPlugins } from "./framework-plugin";
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
