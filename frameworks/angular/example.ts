import type { ExampleLibrary, ExampleOptions } from "../examples.ts";
export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  const imports = [
    'import { Component } from "@angular/core";',
    'import { NgComponentOutlet } from "@angular/common";',
    `import Neodt, { type NeodtProps } from "@olicoad/neodt/angular${library.entry}";`,
    library.imports,
  ].filter(Boolean);
  const props = [
    `referenceTime: ${library.now},`,
    "value: null,",
    "onValueChange: value => { this.props = { ...this.props, value }; },",
    options.locale ? `locale: "${options.locale}",` : "",
    options.hour12 === undefined ? "" : `formatOptions: { hour12: ${options.hour12} },`,
    ...["showTimeOffset", "readonly", "disabled"]
      .filter((key) => options[key as keyof ExampleOptions])
      .map((key) => `${key}: true,`),
  ].filter(Boolean);
  return `${imports.join("\n")}

@Component({
  selector: "example-input",
  standalone: true,
  imports: [NgComponentOutlet],
  template: '<ng-container *ngComponentOutlet="Neodt; inputs: { props: props }" />',
})
export class Example {
  readonly Neodt = Neodt;
  props: NeodtProps = {
    ${props.join("\n    ")}
  };
}`;
}
