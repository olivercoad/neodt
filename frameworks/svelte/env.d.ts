declare module "*.svelte" {
  import type { Component } from "svelte";

  import type { NeodtProps } from "./generic";
  const component: <T, TZone = string>(
    anchor: Parameters<Component>[0],
    props: NeodtProps<T, TZone>,
  ) => ReturnType<Component>;
  export default component;
}
