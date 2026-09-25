import type { DemoRenderer } from "../../dev/framework-host";
import Neodt, { type NeodtProps } from "./generic";

if (!customElements.get("neodt-demo-lit")) customElements.define("neodt-demo-lit", Neodt);
export const mount: DemoRenderer = (element, initial) => {
  const control = document.createElement("neodt-demo-lit") as Neodt<unknown, unknown>;
  control.props = initial as unknown as NeodtProps<unknown, unknown>;
  element.append(control);
  return {
    update(next) {
      control.props = next as unknown as NeodtProps<unknown, unknown>;
    },
    dispose() {
      control.remove();
    },
  };
};
