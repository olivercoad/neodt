import type { ExampleLibrary, ExampleOptions } from "../examples.ts";

export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  const imports = [
    `import createNeodt from "@olicoad/neodt${library.entry}";`,
    library.imports,
  ].filter(Boolean);
  const props = [
    `referenceTime: ${library.now},`,
    options.locale ? `locale: "${options.locale}",` : "",
    options.hour12 === undefined ? "" : `formatOptions: { hour12: ${options.hour12} },`,
    ...["showTimeOffset", "readonly", "disabled"]
      .filter((key) => options[key as keyof ExampleOptions])
      .map((key) => `${key}: true,`),
  ].filter(Boolean);
  return `${imports.join("\n")}

const container = document.querySelector<HTMLElement>("#date")!;
const picker = createNeodt(container, {
  ${props.join("\n  ")}
});

// When removing the owning UI, call picker.destroy().`;
}
