import { createContext, useContext, type Component } from "solid-js";

import type { DateAdapter } from "../src/adapter";
import { calendarDate, type CalendarDate } from "../src/calendar";
import type { ConfiguredNeodtProps } from "../src/configured";
import GenericNeodt from "../src/generic";
import { libraries, type LibraryId } from "./libraries";

// The demo keeps library-independent presentation and persistence around native values.
// Only the selected entry imports a datetime package; the component still receives its native type.
export interface DemoValue {
  calendar: CalendarDate;
  timeZoneId: string;
  toString(options?: { smallestUnit: "minute" }): string;
  withTimeZone(zone: string): DemoValue;
  toPlainTime(): { toString(options?: { smallestUnit: "minute" }): string };
}

export function createDemoLibrary<T, TZone>(
  id: LibraryId,
  adapter: DateAdapter<T, TZone>,
  zone: (id: string) => TZone,
) {
  const nativeValues = new WeakMap<DemoValue, T>();
  const wrap = (native: T, zoneId: string): DemoValue => {
    const calendar = calendarDate(adapter, native);
    const value: DemoValue = {
      calendar,
      timeZoneId: zoneId,
      toString: () => `${calendar.toISO()}[${zoneId}]`,
      withTimeZone: (id) => wrap(adapter.setZoneId(native, id), id),
      toPlainTime: () => ({ toString: () => calendar.toLocalValue().slice(11) }),
    };
    nativeValues.set(value, native);
    return value;
  };
  const now = (id = new Intl.DateTimeFormat().resolvedOptions().timeZone) =>
    wrap(adapter.fromEpochMilliseconds(Date.now(), zone(id)), id);
  const date = (text: string, fallbackZone = "Australia/Sydney") => {
    const match = text.match(/^(.*)\[([^\]]+)\]$/);
    const id = match?.[2] ?? fallbackZone;
    const reference = adapter.fromEpochMilliseconds(0, zone(id));
    const parsed = calendarDate(adapter, reference).fromISO(match?.[1] ?? text);
    if (!parsed) throw new Error(`Invalid demo date: ${text}`);
    return wrap(adapter.fromEpochMilliseconds(parsed.milliseconds, zone(id)), id);
  };
  const native = (value: DemoValue) => {
    const result = nativeValues.get(value);
    if (result === undefined) throw new Error("Value belongs to a different demo library");
    return result;
  };
  const Neodt: Component<ConfiguredNeodtProps<DemoValue>> = (props) => (
    <GenericNeodt
      {...props}
      adapter={adapter}
      referenceTime={native(props.referenceTime)}
      value={props.value == null ? props.value : native(props.value)}
      defaultValue={props.defaultValue === undefined ? undefined : native(props.defaultValue)}
      onValueChange={(value) =>
        props.onValueChange?.(value === null ? null : wrap(value, props.referenceTime.timeZoneId))
      }
    />
  );
  const metadata = libraries.find((library) => library.id === id)!;
  return { ...metadata, nowExpression: metadata.now, Neodt, now, date };
}

export type DemoLibrary = ReturnType<typeof createDemoLibrary>;
export const LibraryContext = createContext<DemoLibrary>();
export function useLibrary() {
  const library = useContext(LibraryContext);
  if (!library) throw new Error("Missing datetime library");
  return library;
}
