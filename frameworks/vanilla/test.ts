import type { CoreProps } from "../../src/core/props";
import Neodt from "./generic";

export function mount<T, TZone>(element: HTMLElement, props: CoreProps<T, TZone>) {
  const instance = Neodt(element, { ...props });
  return { update: instance.update, dispose: instance.destroy };
}
