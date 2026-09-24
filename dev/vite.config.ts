import path from "node:path";

import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

import { checkLibraryEntries } from "./build-library-check";
import { libraries } from "./libraries";

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(import.meta.dirname, "../src"),
    },
  },
  plugins: [solidPlugin(), checkLibraryEntries()],
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
