/** @jsxImportSource solid-js */
import { createRenderEffect, createSignal, createUniqueId, onCleanup, type JSX } from "solid-js";

import Control from "../../generated/solid/Control.jsx";
import type { DateAdapter } from "../../src/adapter";
import { controllerProps, rootAttributes, invokeHandler } from "../../src/core/binding";
import { createController } from "../../src/core/controller";
import type { CoreProps } from "../../src/core/props";

import "../../src/styles.css";
export type NeodtProps<T, TZone = string> = CoreProps<T, TZone> &
  Omit<JSX.HTMLAttributes<HTMLSpanElement>, keyof CoreProps<T, TZone> | "style"> & {
    style?: JSX.CSSProperties;
  };
export default function Neodt<T, TZone>(props: NeodtProps<T, TZone>): JSX.Element {
  const id = createUniqueId();
  const input = () => controllerProps({ ...props }, id);
  const controller = createController(input());
  const [view, setView] = createSignal(controller.getSnapshot());
  onCleanup(controller.unmount);
  onCleanup(controller.subscribe(() => setView(controller.getSnapshot())));
  createRenderEffect(() => controller.update(input()));
  const element = (
    <Control
      view={view()}
      controller={controller}
      attributes={rootAttributes({ ...props })}
      onRootClick={(event: MouseEvent) => {
        invokeHandler(props.onClick, event);
        controller.click(event);
      }}
      onRootMouseDown={(event: MouseEvent) => {
        invokeHandler(props.onMouseDown, event);
        controller.mouseDown(event);
      }}
    />
  );
  // Solid refs exist immediately; preserve synchronous editing inside createRoot.
  if (typeof HTMLElement !== "undefined" && element instanceof HTMLElement)
    controller.mount(element as HTMLSpanElement);
  return element;
}
export { Neodt };
export function configureNeodt<T, TZone>(adapter: DateAdapter<T, TZone>) {
  return (props: Omit<NeodtProps<T, TZone>, "adapter">) => <Neodt {...props} adapter={adapter} />;
}
export * from "../../src/public";
export { parseNaturalDate, type NaturalDateParseOptions } from "../../src/natural-parser";
