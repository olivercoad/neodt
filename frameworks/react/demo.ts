import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import type { DemoRenderer } from "../../dev/framework-host";
import Neodt, { type NeodtProps } from "./generic";
export const mount: DemoRenderer = (element, initial) => {
  const root = createRoot(element);
  const update = (props: Record<string, unknown>) => {
    const next = { ...props };
    if (next.style && typeof next.style === "object")
      next.style = Object.fromEntries(
        Object.entries(next.style).map(([key, value]) => [
          key.startsWith("--")
            ? key
            : key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
          value,
        ]),
      );
    flushSync(() =>
      root.render(createElement(Neodt, next as unknown as NeodtProps<unknown, unknown>)),
    );
  };
  update(initial);
  return { update, dispose: () => root.unmount() };
};
