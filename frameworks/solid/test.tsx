import { createComponent, createSignal } from "solid-js";
import { render, renderToString, hydrate, generateHydrationScript } from "solid-js/web";

import Neodt, { type NeodtProps } from "./generic";
export function renderServer<T, TZone>(props: NeodtProps<T, TZone>) {
  return renderToString(() => createComponent(Neodt<T, TZone>, props));
}
export function mount<T, TZone>(
  element: HTMLElement,
  initial: NeodtProps<T, TZone>,
  hydrating = false,
) {
  const [props, setProps] = createSignal(initial);
  const dispose = (hydrating ? hydrate : render)(() => <Neodt {...props()} />, element);
  return { update: (next: NeodtProps<T, TZone>) => setProps(next), dispose };
}

export const hydrationScript = generateHydrationScript;
