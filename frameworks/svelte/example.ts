import type { ExampleLibrary, ExampleOptions } from "../examples.ts";
export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  return `<script lang="ts">
import Neodt from "@olicoad/neodt/svelte${library.entry}";${library.imports ? `\n${library.imports}` : ""}
const referenceTime = ${library.now};
let value = $state.raw<${library.type} | null>(null);
</script>
<Neodt {referenceTime} {value} onValueChange={next => { value = next; }} ${options.locale ? `locale="${options.locale}"` : ""} ${options.hour12 === undefined ? "" : `formatOptions={{ hour12: ${options.hour12} }}`} ${["showTimeOffset", "readonly", "disabled"].filter((key) => options[key as keyof ExampleOptions]).join(" ")} />`;
}
