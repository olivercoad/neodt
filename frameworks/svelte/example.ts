import type { ExampleLibrary, ExampleOptions } from "../examples.ts";
export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  const localeOption = options.locale ? ` locale="${options.locale}"` : "";
  const hour12Option = options.hour12 ? ` formatOptions={{ hour12: ${options.hour12} }}` : "";
  const extraOptions = ["showTimeOffset", "readonly", "disabled"]
    .filter((key) => options[key as keyof ExampleOptions])
    .map((x) => " " + x)
    .join("");
  return `<script lang="ts">
import Neodt from "@olicoad/neodt/svelte${library.entry}";${library.imports ? `\n${library.imports}` : ""}
const referenceTime = ${library.now};
let value = $state.raw<${library.type} | null>(null);
</script>
<Neodt {referenceTime} {value} onValueChange={next => { value = next; }}${localeOption}${hour12Option}${extraOptions} />`;
}
