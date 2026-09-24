import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import Neodt from "../src/generic";
import { builtInAdapters } from "./helpers/adapters";

for (const implementation of builtInAdapters)
  implementation.run(({ adapter, date }) => {
    type Value = ReturnType<typeof date>;
    describe(implementation.name, () => {
      const referenceTime = date("2026-08-17T15:30", "UTC");
      let dispose: (() => void) | undefined;
      afterEach(() => {
        dispose?.();
        document.body.replaceChildren();
        vi.restoreAllMocks();
      });

      it("forwards and updates an external accessible label on the editor group", () => {
        const [label, setLabel] = createSignal("start-label");
        dispose = render(
          () => <Neodt adapter={adapter} referenceTime={referenceTime} aria-labelledby={label()} />,
          document.body,
        );
        const group = document.querySelector('[role="group"]')!;
        expect(group.getAttribute("aria-labelledby")).toBe("start-label");
        expect(group.hasAttribute("aria-label")).toBe(false);
        setLabel("end-label");
        expect(group.getAttribute("aria-labelledby")).toBe("end-label");
      });

      it("retains the default group name when no accessible name is supplied", () => {
        dispose = render(
          () => <Neodt adapter={adapter} referenceTime={referenceTime} />,
          document.body,
        );
        expect(document.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
          "Date and time",
        );
      });

      it("does not throw when the browser has no native picker API", () => {
        dispose = render(
          () => <Neodt adapter={adapter} referenceTime={referenceTime} />,
          document.body,
        );
        const input = document.querySelector("input")!;
        Object.defineProperty(input, "showPicker", { value: undefined, configurable: true });
        const onError = vi.fn((event: ErrorEvent) => event.preventDefault());
        window.addEventListener("error", onError);
        try {
          document
            .querySelector('[role="spinbutton"]')!
            .dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
          expect(onError).not.toHaveBeenCalled();
        } finally {
          window.removeEventListener("error", onError);
        }
      });

      it("exposes numeric values, localized text, and changing calendar ranges", () => {
        const [value, setValue] = createSignal(
          adapter.setFields(referenceTime, { month: 2, day: 28 }),
        );
        dispose = render(
          () => (
            <Neodt
              adapter={adapter}
              referenceTime={referenceTime}
              value={value()}
              locale="en-US"
              formatOptions={{ month: "long", hour12: true }}
              aria-describedby="help"
              aria-invalid="true"
            />
          ),
          document.body,
        );
        const field = (name: string) =>
          document.querySelector(`[role="spinbutton"][aria-label="${name}"]`)!;
        expect(field("month").getAttribute("aria-valuenow")).toBe("2");
        expect(field("month").getAttribute("aria-valuetext")).toBe("February");
        expect(field("day").getAttribute("aria-valuemax")).toBe("28");
        expect(field("hour").getAttribute("aria-valuenow")).toBe("3");
        expect(field("hour").getAttribute("aria-valuemin")).toBe("1");
        expect(field("hour").getAttribute("aria-valuemax")).toBe("12");
        expect(field("dayPeriod").getAttribute("aria-valuetext")).toBe("PM");
        expect(field("day").getAttribute("aria-describedby")).toBe("help");
        expect(field("day").getAttribute("aria-invalid")).toBe("true");
        setValue(() => adapter.setFields(value()!, { year: 2028 }));
        expect(field("day").getAttribute("aria-valuemax")).toBe("29");
      });

      it("exposes readonly on the spinbuttons", () => {
        dispose = render(
          () => <Neodt adapter={adapter} referenceTime={referenceTime} readonly />,
          document.body,
        );
        expect(document.querySelector('[role="spinbutton"]')?.getAttribute("aria-readonly")).toBe(
          "true",
        );
      });

      it("keeps editing and accessible hour ranges in sync when formatting changes", () => {
        const [options, setOptions] = createSignal<Intl.DateTimeFormatOptions>({
          hourCycle: "h23",
        });
        const [locale, setLocale] = createSignal("en-US");
        const [value, setValue] = createSignal<Value | null>(referenceTime);
        dispose = render(
          () => (
            <Neodt
              adapter={adapter}
              referenceTime={referenceTime}
              value={value()}
              onValueChange={setValue}
              locale={locale()}
              formatOptions={options()}
            />
          ),
          document.body,
        );
        const hour = () =>
          document.querySelector<HTMLElement>('[role="spinbutton"][aria-label="hour"]')!;
        expect(hour().getAttribute("aria-valuenow")).toBe("15");
        expect(hour().getAttribute("aria-valuemax")).toBe("23");
        setOptions({ hour12: true });
        expect(hour().getAttribute("aria-valuenow")).toBe("3");
        expect(hour().getAttribute("aria-valuemax")).toBe("12");
        for (const digit of "11")
          hour().dispatchEvent(new KeyboardEvent("keydown", { key: digit, bubbles: true }));
        expect(adapter.getFields(value()!).hour).toBe(23);
        setOptions({});
        setLocale("en-GB");
        expect(hour().getAttribute("aria-valuenow")).toBe("23");
        expect(hour().getAttribute("aria-valuemax")).toBe("23");
        for (const digit of "00")
          hour().dispatchEvent(new KeyboardEvent("keydown", { key: digit, bubbles: true }));
        expect(adapter.getFields(value()!).hour).toBe(0);
      });

      it.each(["disabled", "readonly"] as const)(
        "does not focus %s controls through their gaps",
        (state) => {
          dispose = render(
            () => (
              <Neodt
                adapter={adapter}
                referenceTime={referenceTime}
                {...{ [state]: true }}
                showTimeOffset
              />
            ),
            document.body,
          );
          const root = document.querySelector<HTMLElement>(".datetime-neo")!;
          root.click();
          root.querySelector<HTMLElement>(".datetime-neo__timezone")!.click();
          expect(root.contains(document.activeElement)).toBe(false);
        },
      );

      it.each([false, true])(
        "preserves root click handlers (bound: %s) and cancellation",
        (bound) => {
          const handler = vi.fn((event: MouseEvent) => event.preventDefault());
          dispose = render(
            () => (
              <Neodt
                adapter={adapter}
                referenceTime={referenceTime}
                onClick={bound ? [(data, event) => data(event), handler] : handler}
              />
            ),
            document.body,
          );
          const root = document.querySelector<HTMLElement>(".datetime-neo")!;
          root.click();
          expect(handler).toHaveBeenCalledTimes(1);
          expect(root.contains(document.activeElement)).toBe(false);
        },
      );

      it.each([false, true])(
        "preserves root mouse-down handlers (bound: %s) and cancellation",
        (bound) => {
          const handler = vi.fn((event: MouseEvent) => event.preventDefault());
          dispose = render(
            () => (
              <Neodt
                adapter={adapter}
                referenceTime={referenceTime}
                onMouseDown={bound ? [(data, event) => data(event), handler] : handler}
              />
            ),
            document.body,
          );
          const root = document.querySelector<HTMLElement>(".datetime-neo")!;
          root.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
          expect(handler).toHaveBeenCalledTimes(1);
          expect(root.contains(document.activeElement)).toBe(false);
        },
      );
    });
  });
