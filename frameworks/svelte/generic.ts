import type { Component, SvelteComponent, ComponentConstructorOptions } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

import type { DateAdapter } from "../../src/adapter";
import type { CoreProps } from "../../src/core/props";
import ComponentImpl from "./Neodt.svelte";

import "../../src/styles.css";
export type NeodtProps<T, TZone = string> = CoreProps<T, TZone> &
  Omit<HTMLAttributes<HTMLSpanElement>, keyof CoreProps<T, TZone>>;
// Match Svelte's isomorphic component declaration so template tooling preserves
// generic inference when converting function components to its class model.
export interface NeodtComponent {
  new <T, TZone = string>(
    options: ComponentConstructorOptions<NeodtProps<T, TZone>>,
  ): SvelteComponent<NeodtProps<T, TZone>>;
  <T, TZone = string>(
    anchor: Parameters<Component>[0],
    props: NeodtProps<T, TZone>,
  ): ReturnType<Component>;
}
const Neodt = ComponentImpl as unknown as NeodtComponent;
export default Neodt;
export { Neodt };
export function configureNeodt<T, TZone>(
  adapter: DateAdapter<T, TZone>,
): Component<Omit<NeodtProps<T, TZone>, "adapter">, {}, ""> {
  return (anchor, props) =>
    ComponentImpl(
      anchor,
      new Proxy(props as NeodtProps<T, TZone>, {
        get(target, key, receiver) {
          return key === "adapter" ? adapter : Reflect.get(target, key, receiver);
        },
        has(target, key) {
          return key === "adapter" || Reflect.has(target, key);
        },
        ownKeys(target) {
          return [...new Set([...Reflect.ownKeys(target), "adapter"])];
        },
        getOwnPropertyDescriptor(target, key) {
          return key === "adapter"
            ? { configurable: true, enumerable: true, value: adapter }
            : Reflect.getOwnPropertyDescriptor(target, key);
        },
      }),
    );
}
export * from "../../src/public";
export { parseNaturalDate, type NaturalDateParseOptions } from "../../src/natural-parser";
