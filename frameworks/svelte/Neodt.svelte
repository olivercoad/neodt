<script lang="ts" generics="T, TZone = string">
  import { onDestroy, untrack } from "svelte";
  import Control from "../../generated/svelte/Control.svelte";
  import { controllerProps, rootAttributes, invokeHandler } from "../../src/core/binding";
  import { createController } from "../../src/core/controller";
  import type { NeodtProps } from "./generic";

  let props: NeodtProps<T, TZone> = $props();
  const id = $props.id();
  const controller = createController(untrack(() => controllerProps({ ...props }, id)));
  let view = $state.raw(controller.getSnapshot());
  onDestroy(controller.subscribe(() => { view = controller.getSnapshot(); }));
  onDestroy(() => controller.unmount());
  function attributes() {
    const { onclick: _click, onmousedown: _mouseDown, ...rest } = props;
    return rootAttributes(rest);
  }
  $effect.pre(() => { controller.update(controllerProps({ ...props }, id)); });
</script>

<Control {view} {controller} attributes={attributes()}
  onRootClick={(event: MouseEvent) => { invokeHandler(props.onclick, event); controller.click(event); }}
  onRootMouseDown={(event: MouseEvent) => { invokeHandler(props.onmousedown, event); controller.mouseDown(event); }} />
