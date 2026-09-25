import type { ControllerProps } from "./controller";
import type { CoreProps } from "./props";

const internal = new Set([
  "adapter",
  "referenceTime",
  "value",
  "defaultValue",
  "onValueChange",
  "locale",
  "formatOptions",
  "showTimeOffset",
  "readonly",
  "disabled",
  "class",
  "className",
  "classList",
  "onClick",
  "onMouseDown",
]);
export function rootAttributes(props: Record<string, unknown>) {
  const attributes = Object.fromEntries(
    Object.entries(props).filter(([key]) => !internal.has(key)),
  );
  const classList = props.classList as Record<string, boolean> | undefined;
  attributes.class = [
    "datetime-neo",
    props.class ?? props.className,
    ...Object.entries(classList ?? {})
      .filter(([, enabled]) => enabled)
      .map(([name]) => name),
  ]
    .filter(Boolean)
    .join(" ");
  return attributes;
}
export function controllerProps<T, TZone>(
  props: CoreProps<T, TZone> & Record<string, unknown>,
  id: string,
): ControllerProps<T, TZone> {
  return {
    ...props,
    id,
    label: props["aria-label"] as string | undefined,
    labelledBy: props["aria-labelledby"] as string | undefined,
    describedBy: props["aria-describedby"] as string | undefined,
    invalid: props["aria-invalid"] as ControllerProps<T, TZone>["invalid"],
  };
}
/** Solid's bound handlers and ordinary callbacks share this small invocation boundary. */
export function invokeHandler(handler: unknown, event: unknown) {
  if (typeof handler === "function") handler(event);
  else if (Array.isArray(handler)) handler[0](handler[1], event);
}
