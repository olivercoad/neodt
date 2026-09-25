import type { ExampleLibrary, ExampleOptions } from "../examples.ts";
export function example(library: ExampleLibrary, options: ExampleOptions = {}) {
  return `import { html, render } from "lit";
import Neodt, { type NeodtProps } from "@olicoad/neodt/lit${library.entry}";
${library.imports}

customElements.define("my-neodt", Neodt);
let props: NeodtProps = {
  referenceTime: ${library.now},
  value: null,
  onValueChange: value => { props = { ...props, value }; update(); },
  ${options.locale ? `locale: "${options.locale}",` : ""}
  ${options.hour12 === undefined ? "" : `formatOptions: { hour12: ${options.hour12} },`}
  ${["showTimeOffset", "readonly", "disabled"]
    .filter((key) => options[key as keyof ExampleOptions])
    .map((key) => `${key}: true,`)
    .join("\n  ")}
};
function update() {
  render(html\`<my-neodt .props=\${props}></my-neodt>\`, document.body);
}
update();`;
}
