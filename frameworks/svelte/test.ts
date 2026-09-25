import { render } from "svelte/server";

import { mount as mountDemo } from "./demo";
import Neodt, { type NeodtProps } from "./generic";
export function renderServer<T, TZone>(props: NeodtProps<T, TZone>) {
  return render(Neodt<T, TZone>, { props }).body;
}
export function mount<T, TZone>(
  element: HTMLElement,
  props: NeodtProps<T, TZone>,
  hydrating = false,
) {
  return mountDemo(element, { ...props }, hydrating);
}
