import "@lit-labs/ssr-client/lit-element-hydrate-support.js";
import { html } from "lit";

import Neodt, { type NeodtProps } from "./generic";

if (!customElements.get("neodt-test-lit")) customElements.define("neodt-test-lit", Neodt);
export async function mount<T, TZone>(
  element: HTMLElement,
  props: NeodtProps<T, TZone>,
  hydrating = false,
) {
  const control = (
    hydrating ? element.querySelector("neodt-test-lit") : document.createElement("neodt-test-lit")
  ) as Neodt<T, TZone>;
  control.props = props;
  if (!hydrating) element.append(control);
  control.removeAttribute("defer-hydration");
  await control.updateComplete;
  return {
    root: control.shadowRoot!,
    async update(next: NeodtProps<T, TZone>) {
      control.props = next;
      await control.updateComplete;
    },
    dispose() {
      control.remove();
    },
  };
}
export async function renderServer<T, TZone>(props: NeodtProps<T, TZone>) {
  const { render } = await import("@lit-labs/ssr");
  return [...render(html`<neodt-test-lit defer-hydration .props=${props}></neodt-test-lit>`)].join(
    "",
  );
}
