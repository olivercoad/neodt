import type { ExampleLibrary, ExampleOptions } from "../examples.ts";
export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  const attributes = [
    options.locale ? `    locale="${options.locale}"` : "",
    options.hour12 === undefined ? "" : `    :format-options="{ hour12: ${options.hour12} }"`,
    ...["showTimeOffset", "readonly", "disabled"]
      .filter((key) => options[key as keyof ExampleOptions])
      .map((key) => "    " + key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase())),
  ].filter(Boolean);
  return `<script setup lang="ts">
import { shallowRef } from "vue";
import Neodt from "@olicoad/neodt/vue${library.entry}";${library.imports ? `\n${library.imports}` : ""}

const referenceTime = ${library.now};
const value = shallowRef<${library.type} | null>(null);
</script>

<template>
  <Neodt
    :reference-time="referenceTime"
    :value="value"
    @value-change="value = $event"${attributes.map((line) => "\n" + line).join("")}
  />
</template>`;
}
