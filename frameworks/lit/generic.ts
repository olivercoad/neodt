import { LitElement, css, nothing, unsafeCSS } from "lit";

import Control from "../../generated/lit/Control";
import type { DateAdapter } from "../../src/adapter";
import { controllerProps, invokeHandler } from "../../src/core/binding";
import { createController } from "../../src/core/controller";
import type { CoreProps } from "../../src/core/props";

import styles from "../../src/styles.css?inline";

export type NeodtProps<T, TZone = string> = CoreProps<T, TZone> & {
  class?: string;
  id?: string;
  title?: string;
  style?: string;
  onClick?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  [attribute: `aria-${string}`]: string | boolean | undefined;
  [attribute: `data-${string}`]: unknown;
};

/** Register the exported class under your own custom-element name, then bind .props. */
export class Neodt<T, TZone = string, P = NeodtProps<T, TZone>> extends LitElement {
  static properties = { props: { attribute: false } };
  static styles = [
    css`
      :host {
        display: contents;
      }
    `,
    unsafeCSS(styles),
  ];
  declare props: P;
  private internals = this.attachInternals?.();
  private controller?: ReturnType<typeof createController<T, TZone>>;
  private unsubscribe?: () => void;
  private hostAttributes = new Map<string, unknown>();
  private updatingProps = false;

  protected get boundProps(): NeodtProps<T, TZone> {
    return this.props as NeodtProps<T, TZone>;
  }
  private subscribe() {
    if (this.controller && !this.unsubscribe)
      this.unsubscribe = this.controller.subscribe(() => {
        if (!this.updatingProps) this.requestUpdate();
      });
  }
  connectedCallback() {
    super.connectedCallback();
    this.subscribe();
    this.requestUpdate();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.controller?.unmount();
  }
  protected willUpdate() {
    if (!this.props) return;
    const props = this.boundProps;
    // IDs only need to be unique within this shadow root, including during SSR.
    const input = controllerProps({ ...props }, "neodt-picker");
    this.updatingProps = true;
    if (this.controller) this.controller.update(input);
    else this.controller = createController(input);
    this.subscribe();
    this.updatingProps = false;
    const attributes = Object.fromEntries(
      Object.entries(props).filter(
        ([key]) =>
          ["class", "id", "title"].includes(key) ||
          key.startsWith("aria-") ||
          key.startsWith("data-"),
      ),
    );
    for (const name of this.hostAttributes.keys())
      if (!(name in attributes)) this.removeAttribute(name);
    for (const [name, value] of Object.entries(attributes)) {
      if (this.hostAttributes.get(name) === value) continue;
      if (value == null) this.removeAttribute(name);
      else this.setAttribute(name, String(value));
    }
    this.hostAttributes = new Map(Object.entries(attributes));
  }
  protected render() {
    if (!this.controller) return nothing;
    const props = this.boundProps;
    const view = this.controller.getSnapshot();
    const states = this.internals?.states;
    if (states) {
      for (const [name, active] of Object.entries({
        readonly: view.readonly,
        disabled: view.disabled,
        wrapped: view.wrapped,
        empty: view.empty,
        natural: view.natural,
        overflowing: view.overflowing,
        "time-offset": view.showTimeOffset,
        "layout-changing": view.layoutChanging,
      })) {
        if (active) states.add(name);
        else states.delete(name);
      }
    }
    return Control({
      view,
      attributes: { class: "datetime-neo", style: props.style },
      onRootClick: (event: MouseEvent) => {
        invokeHandler(props.onClick, event);
        this.controller!.click(event);
      },
      onRootMouseDown: (event: MouseEvent) => {
        invokeHandler(props.onMouseDown, event);
        this.controller!.mouseDown(event);
      },
    });
  }
  protected updated() {
    const root = this.renderRoot.querySelector<HTMLSpanElement>('[part~="root"]');
    if (root && this.isConnected) {
      this.controller!.mount(root);
      this.controller!.afterRender();
    }
  }
}
export default Neodt;
export function configureNeodt<T, TZone>(
  adapter: DateAdapter<T, TZone>,
): new () => Neodt<T, TZone, Omit<NeodtProps<T, TZone>, "adapter">> {
  return class ConfiguredNeodt extends Neodt<T, TZone, Omit<NeodtProps<T, TZone>, "adapter">> {
    protected get boundProps(): NeodtProps<T, TZone> {
      return { ...this.props, adapter };
    }
  };
}
export * from "../../src/public";
export { parseNaturalDate, type NaturalDateParseOptions } from "../../src/natural-parser";
