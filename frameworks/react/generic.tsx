import {
  createElement,
  useMemo,
  useId,
  useRef,
  useSyncExternalStore,
  useEffect,
  useLayoutEffect,
  type HTMLAttributes,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";

import Control from "../../generated/react/Control.jsx";
import type { DateAdapter } from "../../src/adapter";
import { controllerProps, rootAttributes } from "../../src/core/binding";
import { createController } from "../../src/core/controller";
import type { CoreProps } from "../../src/core/props";

import "../../src/styles.css";
export type NeodtProps<T, TZone = string> = CoreProps<T, TZone> &
  Omit<HTMLAttributes<HTMLSpanElement>, keyof CoreProps<T, TZone>> & {
    calendarIcon?: ReactNode;
    magicIcon?: ReactNode;
  };
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
export default function Neodt<T, TZone>(props: NeodtProps<T, TZone>) {
  const id = useId();
  const instance = useRef<ReturnType<typeof createController<T, TZone>> | null>(null);
  if (!instance.current) instance.current = createController(controllerProps({ ...props }, id));
  const controller = instance.current;
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useClientLayoutEffect(() => {
    controller.update(controllerProps({ ...props }, id));
  });
  const attributes = rootAttributes({ ...props });
  attributes.className = attributes.class;
  delete attributes.class;
  const Calendar = useMemo(
    () => (props.calendarIcon == null ? undefined : () => props.calendarIcon),
    [props.calendarIcon],
  );
  const Magic = useMemo(
    () => (props.magicIcon == null ? undefined : () => props.magicIcon),
    [props.magicIcon],
  );
  return createElement(Control, {
    view,
    controller,
    attributes,
    calendarIcon: Calendar,
    magicIcon: Magic,
    onRootClick: (event: ReactMouseEvent<HTMLSpanElement>) => {
      props.onClick?.(event);
      controller.click(event.nativeEvent);
    },
    onRootMouseDown: (event: ReactMouseEvent<HTMLSpanElement>) => {
      props.onMouseDown?.(event);
      controller.mouseDown(event.nativeEvent);
    },
  });
}
export { Neodt };
export function configureNeodt<T, TZone>(adapter: DateAdapter<T, TZone>) {
  return (props: Omit<NeodtProps<T, TZone>, "adapter">) =>
    createElement(Neodt<T, TZone>, { ...props, adapter });
}
export * from "../../src/public";
export { parseNaturalDate, type NaturalDateParseOptions } from "../../src/natural-parser";
