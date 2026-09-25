import { jsxOptions, type ExampleLibrary, type ExampleOptions } from "../examples.ts";
export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  return `import { createSignal } from "solid-js";
import Neodt from "@olicoad/neodt/solid${library.entry}";${library.imports ? `\n${library.imports}` : ""}

export function Appointment() {
  const referenceTime = ${library.now};
  const [value, setValue] = createSignal<${library.type} | null>(null);

  return <Neodt
    referenceTime={referenceTime}
    value={value()}
    onValueChange={setValue}${jsxOptions(options)
      .map((line) => "\n  " + line)
      .join("")}
  />;
}`;
}
