import { createApp, h, shallowRef } from "vue";

import type { DemoRenderer } from "../../dev/framework-host";
import Neodt, { type NeodtProps } from "./generic";
export const mount: DemoRenderer = (element, initial) => {
  const props = shallowRef(initial);
  const app = createApp({
    setup: () => () =>
      h(Neodt<unknown, unknown>, props.value as unknown as NeodtProps<unknown, unknown>),
  });
  app.mount(element);
  return {
    update: (next) => {
      props.value = next;
    },
    dispose: () => app.unmount(),
  };
};
