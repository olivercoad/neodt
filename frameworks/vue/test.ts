import { createSSRApp, createApp, h, shallowRef, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import Neodt, { type NeodtProps } from "./generic";
export function renderServer<T, TZone>(props: NeodtProps<T, TZone>) {
  return renderToString(createSSRApp({ render: () => h(Neodt<T, TZone>, props) }));
}
export async function mount<T, TZone>(
  element: HTMLElement,
  initial: NeodtProps<T, TZone>,
  hydrating = false,
) {
  const props = shallowRef(initial);
  const app = (hydrating ? createSSRApp : createApp)({
    render: () => h(Neodt<T, TZone>, props.value),
  });
  app.mount(element);
  await nextTick();
  return {
    update: async (next: NeodtProps<T, TZone>) => {
      props.value = next;
      await nextTick();
    },
    dispose: () => app.unmount(),
  };
}
