import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { frameworks } from "../frameworks";
import type { CoreProps } from "../src/core/props";
import { builtInAdapters } from "./helpers/adapters";
type Host = {
  mount: <T, TZone>(
    element: HTMLElement,
    props: CoreProps<T, TZone>,
  ) =>
    | { root?: ParentNode; update(props: CoreProps<T, TZone>): unknown; dispose(): unknown }
    | Promise<{
        root?: ParentNode;
        update(props: CoreProps<T, TZone>): unknown;
        dispose(): unknown;
      }>;
};
const hosts = import.meta.glob<Host>("../frameworks/*/test.{ts,tsx}", { eager: true });
// React's test scheduler verifies StrictMode subscriptions and cleanup as well as editing.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
for (const framework of frameworks) {
  const host = Object.entries(hosts).find(([path]) => path.includes(`/${framework.id}/`))![1];
  describe(framework.label, () => {
    for (const implementation of builtInAdapters)
      implementation.run(({ adapter, date }) => {
        it(`${implementation.name}: preserves drafts, focus and native value types across controlled updates`, async () => {
          const element = document.createElement("div");
          document.body.append(element);
          const referenceTime = date("2026-08-17T15:30", "UTC");
          let value: typeof referenceTime | null = referenceTime;
          const changed = vi.fn((next: typeof value) => {
            value = next;
          });
          const props = () => ({
            adapter,
            referenceTime,
            value,
            locale: "en-GB",
            onValueChange: changed,
          });
          const instance = await host.mount(element, props());
          const root = instance.root ?? element;
          const segment = (name: string) =>
            root.querySelector<HTMLElement>(`[role="spinbutton"][aria-label="${name}"]`)!;
          const send = async (key: string) => {
            await act(async () => {
              segment("year").dispatchEvent(
                new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
              );
            });
            await act(async () => {
              await instance.update(props());
            });
          };
          try {
            const year = segment("year");
            await act(async () => year.focus());
            await send("Backspace");
            expect(value).toBeNull();
            expect(segment("month").getAttribute("aria-valuenow")).toBe("8");
            for (const digit of "2028") await send(digit);
            expect(adapter.getFields(value!).year).toBe(2028);
            expect(value).toBeInstanceOf((referenceTime as object).constructor);
            expect(segment("year")).toBe(year);
            value = null;
            await act(async () => {
              await instance.update(props());
            });
            expect(root.querySelectorAll(".datetime-neo__placeholder")).toHaveLength(5);
            value = referenceTime;
            await act(async () => {
              await instance.update(props());
            });
            expect(segment("year").textContent).toBe("2026");
          } finally {
            await instance.dispose();
            element.remove();
          }
        });
      });
  });
}
