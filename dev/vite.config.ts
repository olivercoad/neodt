import path from "node:path";

import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

import { checkLibraryEntries } from "./build-library-check";
import { libraries } from "./libraries";
import { libraryPages } from "./library-plugin";

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(import.meta.dirname, "../src"),
    },
  },
  plugins: [libraryPages(), solidPlugin(), checkLibraryEntries()],
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
        ...libraries.map(({ id }) => [id, path.resolve(import.meta.dirname, id, "index.html")]),
      ]),
    },
  },
});
