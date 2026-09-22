import { DateTime } from "luxon";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, expect, it, vi } from "vitest";

import Neodt from "../src";

const referenceTime = DateTime.fromISO("2026-08-17T15:30", { zone: "UTC" });
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

it("forwards and updates an external accessible label on the editor group", () => {
  const [label, setLabel] = createSignal("start-label");
  dispose = render(
    () => <Neodt referenceTime={referenceTime} aria-labelledby={label()} />,
    document.body,
  );
  const group = document.querySelector('[role="group"]')!;
  expect(group.getAttribute("aria-labelledby")).toBe("start-label");
  expect(group.hasAttribute("aria-label")).toBe(false);
  setLabel("end-label");
  expect(group.getAttribute("aria-labelledby")).toBe("end-label");
});

it("retains the default group name when no accessible name is supplied", () => {
  dispose = render(() => <Neodt referenceTime={referenceTime} />, document.body);
  expect(document.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
    "Date and time",
  );
});

it("does not throw when the browser has no native picker API", () => {
  dispose = render(() => <Neodt referenceTime={referenceTime} />, document.body);
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
