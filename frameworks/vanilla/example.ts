import type { ExampleLibrary, ExampleOptions } from "../examples.ts";

export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  return `import createNeodt from "@olicoad/neodt${library.entry}";
${library.imports}

const container = document.querySelector<HTMLElement>("#date")!;
const picker = createNeodt(container, {
  referenceTime: ${library.now},
  value: null,
  onValueChange: value => { picker.update({ value }); },
  ${options.locale ? `locale: "${options.locale}",` : ""}
  ${options.hour12 === undefined ? "" : `formatOptions: { hour12: ${options.hour12} },`}
  ${["showTimeOffset", "readonly", "disabled"]
    .filter((key) => options[key as keyof ExampleOptions])
    .map((key) => `${key}: true,`)
    .join("\n  ")}
});

// When removing the owning UI, call picker.destroy().`;
}
