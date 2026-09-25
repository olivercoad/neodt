import { mount as mountComponent, unmount, flushSync, hydrate } from "svelte";
import { createSubscriber } from "svelte/reactivity";

import type { DemoRenderer } from "../../dev/framework-host";
import Neodt from "./generic";
export const mount = (
  element: HTMLElement,
  initial: Record<string, unknown>,
  hydrating = false,
): ReturnType<DemoRenderer> => {
  let current = initial;
  let notify = () => {};
  const subscribe = createSubscriber((update) => {
    notify = update;
  });
  const props = new Proxy(initial, {
    get(_target, key) {
      subscribe();
      return current[key as string];
    },
    ownKeys() {
      subscribe();
      return Reflect.ownKeys(current);
    },
    getOwnPropertyDescriptor(_target, key) {
      return { configurable: true, enumerable: true, value: current[key as string] };
    },
  });
  const instance = (hydrating ? hydrate : mountComponent)(Neodt, {
    target: element,
    props: props as never,
  });
  flushSync();
  return {
    update(next: Record<string, unknown>) {
      current = next;
      flushSync(() => notify());
    },
    dispose() {
      void unmount(instance);
    },
  };
};
