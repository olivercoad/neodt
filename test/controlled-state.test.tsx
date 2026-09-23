import { DateTime } from "luxon";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, expect, it, vi } from "vitest";

import { createLuxonAdapter } from "../src/adapters/luxon";
import Neodt from "../src/generic";

const adapter = createLuxonAdapter(DateTime);

const referenceTime = DateTime.fromISO("2026-08-17T15:30", { zone: "UTC" });
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.replaceChildren();
});
const segment = (name: string) =>
  document.querySelector<HTMLElement>(`[role="spinbutton"][aria-label="${name}"]`)!;
const key = (name: string, value: string) =>
  segment(name).dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true }));

it("clears all displayed segments when the parent resets a controlled value", () => {
  const [value, setValue] = createSignal<DateTime | null>(referenceTime);
  const changed = vi.fn();
  dispose = render(
    () => (
      <Neodt
        adapter={adapter}
        referenceTime={referenceTime}
        value={value()}
        onValueChange={changed}
      />
    ),
    document.body,
  );
  setValue(null);
  for (const field of document.querySelectorAll('[role="spinbutton"]')) {
    expect(field.querySelector(".datetime-neo__placeholder")).not.toBeNull();
    expect(field.hasAttribute("aria-valuenow")).toBe(false);
  }
  expect(changed).not.toHaveBeenCalled();
});

it("replaces an unfinished year when the parent assigns another date", () => {
  const [value, setValue] = createSignal<DateTime | null>(referenceTime);
  dispose = render(
    () => (
      <Neodt
        adapter={adapter}
        referenceTime={referenceTime}
        value={value()}
        onValueChange={setValue}
      />
    ),
    document.body,
  );
  key("year", "2");
  setValue(referenceTime.set({ year: 2035, month: 4 }));
  expect(segment("year").textContent).toBe("2035");
  expect(segment("month").getAttribute("aria-valuenow")).toBe("4");
  key("year", "ArrowRight");
  expect(value()!.year).toBe(2035);
});

it("preserves incremental entry when the parent accepts each emitted value", () => {
  const [value, setValue] = createSignal<DateTime | null>(referenceTime);
  dispose = render(
    () => (
      <Neodt
        adapter={adapter}
        referenceTime={referenceTime}
        value={value()}
        onValueChange={setValue}
      />
    ),
    document.body,
  );
  key("year", "Backspace");
  expect(segment("month").getAttribute("aria-valuenow")).toBe("8");
  for (const digit of "2028") key("year", digit);
  expect(value()!.year).toBe(2028);
});

it.each(["readonly", "disabled"] as const)("ignores native picker events while %s", (state) => {
  const changed = vi.fn();
  dispose = render(
    () => (
      <Neodt
        adapter={adapter}
        referenceTime={referenceTime}
        defaultValue={referenceTime}
        {...{ [state]: true }}
        onValueChange={changed}
      />
    ),
    document.body,
  );
  const input = document.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
  input.value = "2027-01-01T12:00";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.value = "";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  expect(changed).not.toHaveBeenCalled();
  expect(segment("year").textContent).toBe("2026");
});

it("emits once for paired native input and change events", () => {
  const changed = vi.fn();
  dispose = render(
    () => <Neodt adapter={adapter} referenceTime={referenceTime} onValueChange={changed} />,
    document.body,
  );
  const input = document.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
  input.value = "2027-01-01T12:00";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  expect(changed).toHaveBeenCalledTimes(1);
});

it("leaves modified arrow keys to the browser", () => {
  const changed = vi.fn();
  dispose = render(
    () => (
      <Neodt
        adapter={adapter}
        referenceTime={referenceTime}
        defaultValue={referenceTime}
        onValueChange={changed}
      />
    ),
    document.body,
  );
  segment("day").dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowUp", ctrlKey: true, bubbles: true }),
  );
  expect(changed).not.toHaveBeenCalled();
});

it("clears an incomplete draft through the native picker", () => {
  dispose = render(() => <Neodt adapter={adapter} referenceTime={referenceTime} />, document.body);
  key("year", "2");
  expect(segment("year").getAttribute("aria-valuenow")).not.toBeNull();
  const input = document.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
  input.value = "";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  expect(segment("year").getAttribute("aria-valuenow")).toBeNull();
  expect(segment("year").textContent).toBe("yyyy");
});

it("restores the accepted date when a native selection matches a partially cleared controlled value", () => {
  dispose = render(
    () => <Neodt adapter={adapter} referenceTime={referenceTime} value={referenceTime} />,
    document.body,
  );
  key("year", "Backspace");
  const input = document.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
  input.value = "2026-08-17T15:30";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  expect(segment("year").textContent).toBe("2026");
});
