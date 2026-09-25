/** @jsxImportSource solid-js */
import { createEffect, onMount, onCleanup } from "solid-js";

import type { NeodtProps } from "../frameworks/solid/generic";
export type DemoControl = <T, TZone>(props: NeodtProps<T, TZone>) => import("solid-js").JSX.Element;
export type DemoRenderer = (
  element: HTMLElement,
  props: Record<string, unknown>,
) => { update(props: Record<string, unknown>): void; dispose(): void };
/** The documentation shell stays Solid; each control is mounted by the selected framework. */
export function frameworkHost(mount: DemoRenderer): DemoControl {
  return (props) => {
    let element!: HTMLSpanElement;
    let instance: ReturnType<DemoRenderer> | undefined;
    onMount(() => {
      instance = mount(element, { ...props });
    });
    createEffect(() => {
      instance?.update({ ...props });
    });
    onCleanup(() => instance?.dispose());
    return <span ref={element} style={{ display: "contents" }} />;
  };
}
