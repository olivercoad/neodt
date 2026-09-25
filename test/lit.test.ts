import { DateTime } from "luxon";
import { expect, it, vi } from "vitest";

import { configureNeodt } from "../frameworks/lit/generic";
import { adapter } from "../src/libraries/luxon";

it("Lit configured elements retain their adapter and reconnect without duplicate listeners", async () => {
  const Component = configureNeodt(adapter);
  customElements.define("neodt-configured-test", Component);
  const control = new Component();
  const referenceTime = DateTime.fromISO("2026-08-17T15:30", { zone: "UTC" });
  const changed = vi.fn();
  const clicked = vi.fn();
  control.props = {
    referenceTime,
    defaultValue: referenceTime,
    onValueChange: changed,
    onClick: clicked,
    class: "theme-paper",
    title: "Before",
    "data-test": "present",
  };
  document.body.append(control);
  await control.updateComplete;
  const root = control.shadowRoot!.querySelector<HTMLElement>('[part~="root"]')!;
  const year = control.shadowRoot!.querySelector<HTMLElement>('[aria-label="year"]')!;
  const increment = async () => {
    year.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await control.updateComplete;
  };
  try {
    expect(control.className).toBe("theme-paper");
    expect(control.querySelector(".datetime-neo")).toBeNull();
    root.click();
    expect(clicked).toHaveBeenCalledTimes(1);
    await increment();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0]![0]).toBeInstanceOf(DateTime);
    expect(changed.mock.calls[0]![0].year).toBe(2027);
    control.remove();
    await increment();
    expect(changed).toHaveBeenCalledTimes(1);
    document.body.append(control);
    await control.updateComplete;
    await increment();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(changed.mock.calls[1]![0].year).toBe(2028);
    expect(control.shadowRoot!.querySelector('[aria-label="year"]')).toBe(year);
    control.props = { referenceTime, readonly: true };
    await control.updateComplete;
    expect(control.hasAttribute("title")).toBe(false);
    expect(control.hasAttribute("data-test")).toBe(false);
    expect(root.getAttribute("part")).toBe("root");
    expect(root.hasAttribute("data-readonly")).toBe(true);
    root.click();
    expect(clicked).toHaveBeenCalledTimes(1);
  } finally {
    control.remove();
  }
});

it("Lit reconciles native contenteditable input without losing its rendered nodes", async () => {
  const Component = configureNeodt(adapter);
  customElements.define("neodt-native-input-test", Component);
  const control = new Component();
  const referenceTime = DateTime.fromISO("2026-08-17T15:30", { zone: "UTC" });
  const changed = vi.fn();
  control.props = { referenceTime, defaultValue: referenceTime, onValueChange: changed };
  document.body.append(control);
  await control.updateComplete;
  try {
    const year = control.shadowRoot!.querySelector<HTMLElement>('[aria-label="year"]')!;
    year.dispatchEvent(
      new InputEvent("beforeinput", { inputType: "insertText", data: "2", bubbles: true }),
    );
    year.textContent = "2";
    year.dispatchEvent(
      new InputEvent("input", { inputType: "insertText", data: "2", bubbles: true }),
    );
    await control.updateComplete;
    expect(year.textContent).toBe("2");
    year.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
    await control.updateComplete;
    expect(year.textContent).toBe("20");
  } finally {
    control.remove();
  }
});
