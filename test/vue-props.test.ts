import { DateTime } from "luxon";
import { expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef, type Component } from "vue";

// Load through Vite, which owns the generated SFC compiler (as in the framework matrix).
const modules = import.meta.glob<{ default: Component }>("../generated/vue/luxon.ts", {
  eager: true,
});
const Neodt = Object.values(modules)[0]!.default;

it("accepts template-style props, bare booleans and parent updates without leaking props to the DOM", async () => {
  const referenceTime = DateTime.fromISO("2026-09-24T09:30:00", { zone: "Australia/Melbourne" });
  const value = shallowRef<DateTime | null>(referenceTime);
  const readonly = shallowRef(true);
  const changed = vi.fn((next: DateTime | null) => {
    value.value = next;
  });
  const element = document.createElement("div");
  document.body.append(element);
  // Vue's SFC compiler preserves these kebab-case names in the vnode props.
  const app = createApp({
    render: () =>
      h(Neodt, {
        "reference-time": referenceTime,
        "default-value": referenceTime,
        "format-options": { hour12: false },
        "show-time-offset": "",
        readonly: readonly.value ? "" : false,
        value: value.value,
        onValueChange: changed,
        locale: "en-AU",
        id: "appointment",
        "aria-labelledby": "appointment-label",
        "data-example": "vue",
      }),
  });
  try {
    app.mount(element);
    await nextTick();
    const input = element.querySelector<HTMLElement>("#appointment")!;
    const year = () => input.querySelector<HTMLElement>('[role="spinbutton"][aria-label="year"]')!;
    expect(year().textContent).toBe("2026");
    expect(input.hasAttribute("data-time-offset")).toBe(true);
    expect(input.hasAttribute("data-readonly")).toBe(true);
    expect(input.querySelector('[role="group"]')?.getAttribute("aria-labelledby")).toBe(
      "appointment-label",
    );
    expect(input.getAttribute("data-example")).toBe("vue");
    for (const name of ["reference-time", "default-value", "format-options", "show-time-offset"])
      expect(input.hasAttribute(name)).toBe(false);
    readonly.value = false;
    value.value = referenceTime.plus({ years: 1 });
    await nextTick();
    expect(input.hasAttribute("data-readonly")).toBe(false);
    expect(year().textContent).toBe("2027");
    expect(changed).not.toHaveBeenCalled();
    year().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await nextTick();
    expect(changed).toHaveBeenCalledOnce();
    expect(value.value?.year).toBe(2028);
    expect(value.value).toBeInstanceOf(DateTime);
  } finally {
    app.unmount();
    element.remove();
  }
});
