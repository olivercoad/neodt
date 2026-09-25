import { nothing, render } from "lit-html";

import Control from "../../generated/vanilla/Control";
import type { DateAdapter } from "../../src/adapter";
import { controllerProps, rootAttributes } from "../../src/core/binding";
import { createController } from "../../src/core/controller";
import type { CoreProps } from "../../src/core/props";
import { installStyles } from "./styles";

export type NeodtProps<T, TZone = string> = CoreProps<T, TZone> & {
  class?: string;
  id?: string;
  title?: string;
  style?: string;
  role?: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  onClick?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  [attribute: `aria-${string}`]: string | boolean | undefined;
  [attribute: `data-${string}`]: unknown;
};

export interface NeodtInstance<P> {
  readonly element: HTMLSpanElement;
  /** Merge options into the current options. Pass undefined to remove an optional option. */
  update(options: Partial<P>): void;
  /** Remove this control and release its subscriptions, listeners and browser effects. */
  destroy(): void;
}

let nextId = 0;

/** Append a control to a container. The container's existing children are retained. */
export default function Neodt<T, TZone>(
  container: HTMLElement,
  initial: NeodtProps<T, TZone>,
): NeodtInstance<NeodtProps<T, TZone>> {
  if (typeof document === "undefined") throw new Error("Mounting neodt requires a browser DOM.");
  let props = { ...initial };
  const id = `neodt-vanilla-${++nextId}`;
  const controller = createController(controllerProps(props, id));
  installStyles(container.ownerDocument);
  const marker = container.ownerDocument.createComment("neodt");
  container.append(marker);
  const options = { renderBefore: marker };
  let element: HTMLSpanElement;
  let part: ReturnType<typeof render> | undefined;
  let attributes: Record<string, unknown> = {};
  let destroyed = false;
  let rendering = false;
  let pending = false;
  let unsubscribe = () => {};

  function refresh() {
    if (destroyed) return;
    pending = true;
    if (rendering) return;
    rendering = true;
    try {
      do {
        pending = false;
        const next = rootAttributes(props);
        part = render(
          Control({
            view: controller.getSnapshot(),
            attributes: next,
            onRootClick(event: MouseEvent) {
              props.onClick?.(event);
              if (!destroyed) controller.click(event);
            },
            onRootMouseDown(event: MouseEvent) {
              props.onMouseDown?.(event);
              if (!destroyed) controller.mouseDown(event);
            },
          }),
          container,
          options,
        );
        element = part.startNode!.nextSibling as HTMLSpanElement;
        // Class and style are template bindings; other attributes belong on the root.
        for (const name of Object.keys(attributes)) {
          if (!(name in next)) element.removeAttribute(name);
        }
        for (const [name, value] of Object.entries(next)) {
          if (name === "class" || name === "style") continue;
          if (value == null) element.removeAttribute(name);
          else if (attributes[name] !== value) element.setAttribute(name, String(value));
        }
        attributes = next;
        controller.afterRender();
      } while (pending && !destroyed);
    } finally {
      rendering = false;
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unsubscribe();
    controller.unmount();
    if (part) {
      render(nothing, container, options);
      part.setConnected(false);
      part.startNode?.parentNode?.removeChild(part.startNode);
    }
    marker.remove();
  }

  try {
    refresh();
    unsubscribe = controller.subscribe(refresh);
    controller.mount(element!);
  } catch (error) {
    destroy();
    throw error;
  }
  return {
    element: element!,
    update(next) {
      if (destroyed) throw new Error("Cannot update a destroyed neodt control.");
      props = { ...props, ...next };
      controller.update(controllerProps(props, id));
      // Native attributes and callbacks may change without a new controller snapshot.
      refresh();
    },
    destroy,
  };
}

export { Neodt, Neodt as createNeodt };
export function configureNeodt<T, TZone>(adapter: DateAdapter<T, TZone>) {
  type Props = Omit<NeodtProps<T, TZone>, "adapter">;
  return (container: HTMLElement, props: Props): NeodtInstance<Props> => {
    const instance = Neodt(container, { ...props, adapter });
    return {
      element: instance.element,
      update: (next) => instance.update({ ...next, adapter }),
      destroy: instance.destroy,
    };
  };
}
export * from "../../src/public";
export { parseNaturalDate, type NaturalDateParseOptions } from "../../src/natural-parser";
