import vue from "@vitejs/plugin-vue";
import type { PluginOption } from "vite";
export const plugins = (): PluginOption[] => [vue()];
export const compiler = "vue-tsc";
export const extension = "vue";
export const render = (generic: boolean, callback: string) => `</script>
<template>
<Neodt ${generic ? ':adapter="adapter"' : ""} :reference-time="referenceTime" @value-change="value => { ${callback}; }" />
<!-- @vue-expect-error Mixed datetime values must be rejected. -->
<Neodt ${generic ? ':adapter="adapter"' : ""} :reference-time="referenceTime" value="invalid" />
</template>`;
export const wrap = (script: string) =>
  `<script setup lang="ts">\n${script.replaceAll("export const", "const")}`;
