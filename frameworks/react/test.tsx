import { createElement, act, StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import Neodt, { type NeodtProps } from "./generic";
export function renderServer<T, TZone>(props: NeodtProps<T, TZone>) {
  return renderToString(createElement(Neodt<T, TZone>, props));
}
export async function mount<T, TZone>(
  element: HTMLElement,
  initial: NeodtProps<T, TZone>,
  hydrating = false,
) {
  const view = (props: NeodtProps<T, TZone>) =>
    createElement(StrictMode, null, createElement(Neodt<T, TZone>, props));
  let root!: ReturnType<typeof createRoot>;
  await act(async () => {
    root = hydrating ? hydrateRoot(element, view(initial)) : createRoot(element);
    if (!hydrating) root.render(view(initial));
  });
  return {
    update: async (next: NeodtProps<T, TZone>) => {
      await act(async () => root.render(view(next)));
    },
    dispose: async () => {
      await act(async () => root.unmount());
    },
  };
}
