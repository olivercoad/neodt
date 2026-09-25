import { describe, expect, it, vi } from "vitest";

import { CalendarDate } from "../src/calendar";
import { createController, type EditorController } from "../src/core/controller";
import { builtInAdapters } from "./helpers/adapters";

function mount(controller: Pick<EditorController, "getSnapshot" | "mount">) {
  const root = document.createElement("span");
  const content = document.createElement("span");
  content.className = "datetime-neo__content";
  const editor = document.createElement("span");
  editor.className = "datetime-neo__editor";
  for (const part of controller.getSnapshot().rows.flat()) {
    if (!part.editable) continue;
    const segment = document.createElement("span");
    segment.setAttribute("role", "spinbutton");
    segment.tabIndex = -1;
    editor.append(segment);
  }
  content.append(editor);
  root.append(content);
  document.body.append(root);
  controller.mount(root);
  return root;
}

for (const implementation of builtInAdapters)
  implementation.run(({ adapter, date }) => {
    describe(`${implementation.name}: controller caching`, () => {
      it("moves focus with one snapshot and no date formatting or reconstruction", () => {
        const referenceTime = date("2026-08-17T15:30", "UTC");
        const props = { adapter, id: "navigation", referenceTime, defaultValue: referenceTime };
        const controller = createController(props);
        const root = mount(controller);
        const segments = root.querySelectorAll<HTMLElement>('[role="spinbutton"]');
        segments[0]!.focus();
        const initial = controller.getSnapshot();
        const publish = vi.fn();
        const unsubscribe = controller.subscribe(publish);
        const format = vi.spyOn(CalendarDate.prototype, "toLocaleParts");
        const construct = vi.spyOn(Intl, "DateTimeFormat");
        const fromFields = vi.spyOn(adapter, "fromFields");
        try {
          for (const [key, index] of [
            ["ArrowRight", 1],
            ["ArrowLeft", 0],
          ] as const) {
            publish.mockClear();
            document.activeElement!.dispatchEvent(
              new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
            );
            expect(document.activeElement).toBe(segments[index]);
            expect(publish).toHaveBeenCalledTimes(1);
            const snapshot = controller.getSnapshot();
            expect(snapshot.activeItem).toBe(index);
            expect(
              snapshot.rows.flat().filter((part) => part.editable && part.selected),
            ).toMatchObject([{ index, tabIndex: 0 }]);
            expect(snapshot.measurements).toBe(initial.measurements);
            expect(snapshot.nativeValue).toBe(initial.nativeValue);
            // React and Vue forward props again after rendering each snapshot.
            controller.update({ ...props });
          }
          expect(format).not.toHaveBeenCalled();
          expect(construct).not.toHaveBeenCalled();
          expect(fromFields).not.toHaveBeenCalled();
        } finally {
          format.mockRestore();
          construct.mockRestore();
          fromFields.mockRestore();
          unsubscribe();
          controller.unmount();
          root.remove();
        }
      });

      it("refreshes cached dates, locale, hour cycle and measurements when props change", () => {
        const referenceTime = date("2026-08-17T15:30", "UTC");
        const props = {
          adapter,
          id: "updates",
          referenceTime,
          value: referenceTime,
          locale: "en-GB",
          formatOptions: { hourCycle: "h23" } as Intl.DateTimeFormatOptions,
        };
        const controller = createController(props);
        const part = (name: string) =>
          controller
            .getSnapshot()
            .rows.flat()
            .find((part) => part.editable && part.type === name);
        try {
          expect(part("hour")).toMatchObject({ text: "15", min: 0, max: 23 });
          const initial = controller.getSnapshot().measurements;
          controller.update({ ...props, locale: "en-US", formatOptions: { hourCycle: "h12" } });
          expect(part("hour")).toMatchObject({ text: "3", min: 1, max: 12 });
          expect(part("dayPeriod")).toMatchObject({ text: "PM" });
          expect(controller.getSnapshot().rows[0]![0]).toMatchObject({ type: "month" });
          expect(controller.getSnapshot().measurements).not.toBe(initial);
          expect(controller.getSnapshot().measurements[0]!.flat()).toContainEqual({
            type: "dayPeriod",
            value: "AM",
            editable: true,
          });

          const value = date("2028-02-29T09:45", "UTC");
          controller.update({ ...props, value });
          expect(part("year")).toMatchObject({ text: "2028" });
          expect(part("day")).toMatchObject({ text: "29", max: 29 });
          expect(part("hour")).toMatchObject({ text: "09", min: 0, max: 23 });
          expect(part("dayPeriod")).toBeUndefined();
          expect(controller.getSnapshot().nativeValue).toBe("2028-02-29T09:45");

          controller.update({
            ...props,
            value,
            referenceTime: date("2026-08-17T15:30", "Asia/Kathmandu"),
          });
          expect(part("hour")).toMatchObject({ text: "15" });
          expect(controller.getSnapshot().nativeValue).toBe("2028-02-29T15:30");
          expect(controller.getSnapshot().offset).toMatchObject({ hours: "+5", minutes: ":45" });
        } finally {
          controller.unmount();
        }
      });
    });
  });
