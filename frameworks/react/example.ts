import { jsxOptions, type ExampleLibrary, type ExampleOptions } from "../examples.ts";
export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  return `import { useState } from "react";
import Neodt from "@olicoad/neodt/react${library.entry}";${library.imports ? `\n${library.imports}` : ""}

export function Appointment() {
  const [referenceTime] = useState(() => ${library.now});
  const [value, setValue] = useState<${library.type} | null>(null);

  return <Neodt
    referenceTime={referenceTime}
    value={value}
    onValueChange={setValue}${jsxOptions(options)
      .map((line) => "\n  " + line)
      .join("")}
  />;
}`;
}
