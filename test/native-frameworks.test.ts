import "@angular/compiler";
import { createComponent } from "@angular/core";
import { createApplication } from "@angular/platform-browser";
import { DateTime } from "luxon";
import { mount as mountComponent, unmount, flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";

import AngularNeodt, { configureNeodt } from "../frameworks/angular/generic";
import { mount as mountAngular } from "../frameworks/angular/test";
import { configureNeodt as configureSvelte } from "../frameworks/svelte/generic";
import { mount as mountSvelte } from "../frameworks/svelte/test";
import { adapter } from "../src/libraries/luxon";

const referenceTime = DateTime.fromISO("2026-08-17T15:30", { zone: "UTC" });
for (const [name, mount, eventName] of [
  ["Angular", mountAngular, "onClick"],
  ["Svelte", mountSvelte, "onclick"],
] as const) {
  describe(name, () => {
    it("updates and removes native attributes and invokes click handlers once", async () => {
      const element = document.createElement("div");
      document.body.append(element);
      const clicked = vi.fn();
      const base = { adapter, referenceTime, value: referenceTime };
      const instance = await mount(element, { ...base, title: "Before", [eventName]: clicked });
      try {
        const root = element.querySelector<HTMLElement>(".datetime-neo")!;
        root.click();
        expect(clicked).toHaveBeenCalledTimes(1);
        await instance.update({ ...base, title: "After" });
        expect(root.title).toBe("After");
        await instance.update(base);
        expect(root.hasAttribute("title")).toBe(false);
        root.click();
        expect(clicked).toHaveBeenCalledTimes(1);
      } finally {
        await instance.dispose();
        element.remove();
      }
    });
  });
}
it("Angular gives sibling controls unique IDs and supports configured components", async () => {
  const app = await createApplication();
  const elements = [document.createElement("div"), document.createElement("div")];
  const components = [AngularNeodt, configureNeodt(adapter)].map((component, index) => {
    document.body.append(elements[index]!);
    const instance = createComponent<object>(component, {
      environmentInjector: app.injector,
      hostElement: elements[index]!,
    });
    app.attachView(instance.hostView);
    instance.setInput("props", index === 0 ? { adapter, referenceTime } : { referenceTime });
    instance.changeDetectorRef.detectChanges();
    return instance;
  });
  try {
    const ids = elements.map((element) => element.querySelector("input")!.id);
    expect(ids[0]).not.toBe(ids[1]);
    for (const [index, element] of elements.entries()) {
      expect(element.querySelector("label")!.htmlFor).toBe(ids[index]);
      expect(element.querySelector('[aria-label="year"]')).not.toBeNull();
    }
  } finally {
    components.forEach((component) => component.destroy());
    app.destroy();
    elements.forEach((element) => element.remove());
  }
});

it("Svelte configured components retain the adapter and emit native datetime values", async () => {
  const element = document.createElement("div");
  document.body.append(element);
  const changed = vi.fn();
  const instance = mountComponent(configureSvelte(adapter), {
    target: element,
    props: { referenceTime, value: referenceTime, onValueChange: changed },
  });
  flushSync();
  try {
    const year = element.querySelector<HTMLElement>('[aria-label="year"]')!;
    year.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    flushSync();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0]![0]).toBeInstanceOf(DateTime);
    expect(changed.mock.calls[0]![0].year).toBe(2027);
  } finally {
    await unmount(instance);
    element.remove();
  }
});
