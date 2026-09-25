import type { DemoRenderer } from "../../dev/framework-host";
import Neodt, { type NeodtProps } from "./generic";

export const mount: DemoRenderer = (element, props) => {
  const instance = Neodt(element, props as unknown as NeodtProps<unknown, unknown>);
  let previous = props;
  return {
    update(next) {
      // The demo host supplies complete props; the public API accepts patches.
      const removed = Object.fromEntries(
        Object.keys(previous)
          .filter((key) => !(key in next))
          .map((key) => [key, undefined]),
      );
      previous = next;
      instance.update({ ...removed, ...next } as Partial<NeodtProps<unknown, unknown>>);
    },
    dispose: instance.destroy,
  };
};
