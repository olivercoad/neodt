import { cp, readdir } from "node:fs/promises";
import path from "node:path";

import vue from "@vitejs/plugin-vue";

import type { FrameworkTooling } from "../tooling.ts";

export default {
  plugins: () => [vue()],
  build: {
    plugins: [
      {
        name: "vue-components",
        resolveId(id) {
          if (id.endsWith(".vue")) return { id: `./${path.basename(id)}`, external: true };
        },
      },
    ],
    hooks: {
      "build:done": async () => {
        for (const file of await readdir("generated/vue"))
          if (file.endsWith(".vue")) await cp(`generated/vue/${file}`, `dist/vue/${file}`);
      },
    },
  },
  consumer: {
    compiler: "vue-tsc",
    extension: "vue",
    render: (generic, callback) => `</script>
<template>
<Neodt ${generic ? ':adapter="adapter"' : ""} :reference-time="referenceTime" @value-change="value => { ${callback}; }" />
<!-- @vue-expect-error Mixed datetime values must be rejected. -->
<Neodt ${generic ? ':adapter="adapter"' : ""} :reference-time="referenceTime" value="invalid" />
</template>`,
    wrap: (script) => `<script setup lang="ts">\n${script.replaceAll("export const", "const")}`,
  },
} satisfies FrameworkTooling;
