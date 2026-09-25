import { DateTime } from "luxon";
import { afterEach, expect, it, vi } from "vitest";

import createNeodt from "../generated/vanilla/luxon";

const referenceTime = DateTime.fromISO("2026-08-17T15:30", { zone: "UTC" });
afterEach(() => {
  document.body.replaceChildren();
});

it("mounts independent controls and destroys only the owned DOM and listeners", () => {
  const container = document.createElement("div");
  const sibling = document.createElement("p");
  container.append(sibling);
  document.body.append(container);
  const changed = vi.fn();
  const first = createNeodt(container, {
    referenceTime,
    defaultValue: referenceTime,
    onValueChange: changed,
  });
  const second = createNeodt(container, { referenceTime, defaultValue: referenceTime });
  const year = first.element.querySelector<HTMLElement>('[aria-label="year"]')!;
  const secondYear = second.element.querySelector<HTMLElement>('[aria-label="year"]')!;
  expect(first.element.querySelector("input")!.id).not.toBe(
    second.element.querySelector("input")!.id,
  );
  const increment = (element: HTMLElement) =>
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
  increment(year);
  expect(changed).toHaveBeenCalledTimes(1);
  first.destroy();
  first.destroy();
  increment(year);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(() => first.update({ disabled: true })).toThrow("destroyed");
  expect(container.contains(second.element)).toBe(true);
  increment(secondYear);
  expect(secondYear.textContent).toBe("2027");
  second.destroy();
  expect([...container.childNodes]).toEqual([sibling]);
});

it("merges options, removes native attributes, and keeps callback and controlled updates synchronous", () => {
  const container = document.createElement("div");
  document.body.append(container);
  const changed = vi.fn((value: DateTime | null) => picker.update({ value }));
  const clicked = vi.fn();
  const picker = createNeodt(container, {
    referenceTime,
    value: referenceTime,
    onValueChange: changed,
    class: "theme-paper",
    style: "color: red",
    title: "Before",
    "data-test": "present",
    "aria-label": "Appointment",
    onClick: clicked,
  });
  try {
    const root = picker.element;
    const year = root.querySelector<HTMLElement>('[aria-label="year"]')!;
    year.focus();
    year.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0]![0]).toBeInstanceOf(DateTime);
    expect(changed.mock.calls[0]![0]!.year).toBe(2027);
    expect(root.querySelector('[aria-label="year"]')).toBe(year);
    expect(document.activeElement).toBe(year);
    root.click();
    expect(clicked).toHaveBeenCalledTimes(1);
    picker.update({
      title: undefined,
      "data-test": undefined,
      style: undefined,
      class: undefined,
      onClick: undefined,
      readonly: true,
    });
    expect(root.hasAttribute("title")).toBe(false);
    expect(root.hasAttribute("data-test")).toBe(false);
    expect(root.hasAttribute("style")).toBe(false);
    expect(root.className).toBe("datetime-neo");
    expect(root.getAttribute("aria-label")).toBe("Appointment");
    expect(root.hasAttribute("data-readonly")).toBe(true);
    root.click();
    expect(clicked).toHaveBeenCalledTimes(1);
  } finally {
    picker.destroy();
  }
});

it("reconciles contenteditable input without replacing the editing node", () => {
  const container = document.createElement("div");
  document.body.append(container);
  const picker = createNeodt(container, { referenceTime, defaultValue: referenceTime });
  try {
    const year = picker.element.querySelector<HTMLElement>('[aria-label="year"]')!;
    year.focus();
    year.textContent = "2";
    year.dispatchEvent(
      new InputEvent("input", { inputType: "insertText", data: "2", bubbles: true }),
    );
    expect(year.textContent).toBe("2");
    year.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
    expect(year.textContent).toBe("20");
    expect(picker.element.querySelector('[aria-label="year"]')).toBe(year);
  } finally {
    picker.destroy();
  }
});
