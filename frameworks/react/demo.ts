import { createElement, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { frameworkHost } from "../../dev/framework-host";
import Neodt, { type NeodtProps } from "./generic";
// Documentation icons are DOM nodes produced by the Solid shell.
function DemoIcon({ node }: { node: Node }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    ref.current?.replaceChildren(node.cloneNode(true));
  }, [node]);
  return createElement("span", { ref, style: { display: "contents" } });
}
export const Control = frameworkHost((element, initial) => {
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
    for (const name of ["calendarIcon", "magicIcon"])
      if (next[name] instanceof Node) next[name] = createElement(DemoIcon, { node: next[name] });
    flushSync(() =>
      root.render(createElement(Neodt, next as unknown as NeodtProps<unknown, unknown>)),
    );
  };
  update(initial);
  return { update, dispose: () => root.unmount() };
});
