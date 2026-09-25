import { createApp, defineComponent, h, shallowRef, onMounted, onUpdated, ref } from "vue";

import { frameworkHost } from "../../dev/framework-host";
import Neodt, { type NeodtProps } from "./generic";
const DemoIcon = defineComponent({
  props: ["node"],
  setup(props) {
    const element = ref<HTMLElement>();
    const update = () => element.value?.replaceChildren((props.node as Node).cloneNode(true));
    onMounted(update);
    onUpdated(update);
    return () => h("span", { ref: element, style: { display: "contents" } });
  },
});
export const Control = frameworkHost((element, initial) => {
  const props = shallowRef(initial);
  const app = createApp({
    setup: () => () =>
      h(
        Neodt<unknown, unknown>,
        props.value as unknown as NeodtProps<unknown, unknown>,
        Object.fromEntries(
          ["calendarIcon", "magicIcon"]
            .filter((key) => props.value[key] instanceof Node)
            .map((key) => [key, () => h(DemoIcon, { node: props.value[key] })]),
        ),
      ),
  });
  app.mount(element);
  return {
    update: (next) => {
      props.value = next;
    },
    dispose: () => app.unmount(),
  };
});
