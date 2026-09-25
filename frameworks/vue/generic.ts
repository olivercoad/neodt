import {
  defineComponent,
  h,
  shallowRef,
  useId,
  onUnmounted,
  type HTMLAttributes,
  type VNode,
} from "vue";

import Control from "../../generated/vue/Control.vue";
import type { DateAdapter } from "../../src/adapter";
import { controllerProps, rootAttributes, invokeHandler } from "../../src/core/binding";
import { createController } from "../../src/core/controller";
import type { CoreProps } from "../../src/core/props";

import "../../src/styles.css";
export type NeodtProps<T, TZone = string> = CoreProps<T, TZone> &
  Omit<HTMLAttributes, keyof CoreProps<T, TZone>>;
export type VueContext<T> = {
  attrs: Record<string, unknown>;
  emit: (event: "valueChange", value: T | null) => void;
};
export type ConfiguredComponent<T, TZone> = new () => {
  $props: Omit<NeodtProps<T, TZone>, "adapter">;
};
const Component = defineComponent({
  name: "Neodt",
  inheritAttrs: false,
  // Declared props let Vue normalize template kebab-case names and cast bare
  // boolean attributes. Keep datetime/adapter values opaque to Vue's validator.
  props: {
    adapter: null,
    referenceTime: null,
    value: null,
    defaultValue: null,
    onValueChange: null,
    locale: null,
    formatOptions: null,
    showTimeOffset: Boolean,
    readonly: Boolean,
    disabled: Boolean,
  },
  setup(props, { attrs }) {
    const id = useId();
    const boundProps = () => ({ ...attrs, ...props });
    const input = () =>
      controllerProps(boundProps() as CoreProps<unknown, unknown> & Record<string, unknown>, id);
    const controller = createController(input());
    const view = shallowRef(controller.getSnapshot());
    onUnmounted(
      controller.subscribe(() => {
        view.value = controller.getSnapshot();
      }),
    );
    return () => {
      controller.update(input());
      return h(Control, {
        view: view.value,
        controller,
        attributes: rootAttributes(boundProps()),
        onRootClick: (event: MouseEvent) => {
          invokeHandler(attrs.onClick, event);
          controller.click(event);
        },
        onRootMouseDown: (event: MouseEvent) => {
          invokeHandler(attrs.onMouseDown, event);
          controller.mouseDown(event);
        },
      });
    };
  },
});
const Neodt = Component as unknown as {
  <T, TZone = string>(
    props: NeodtProps<T, TZone>,
    context?: VueContext<T>,
  ): VNode & { __ctx?: VueContext<T> & { props: NeodtProps<T, TZone> } };
};
export default Neodt;
export { Neodt };
export function configureNeodt<T, TZone>(
  adapter: DateAdapter<T, TZone>,
): ConfiguredComponent<T, TZone> {
  return defineComponent({
    name: "ConfiguredNeodt",
    inheritAttrs: false,
    setup(_props, { attrs }) {
      return (): VNode => h(Component, { ...attrs, adapter });
    },
  }) as unknown as ConfiguredComponent<T, TZone>;
}
export * from "../../src/public";
export { parseNaturalDate, type NaturalDateParseOptions } from "../../src/natural-parser";
