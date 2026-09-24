import type { DateAdapter } from "./adapter";

type Entry = { zone: unknown; key: string; formatter: unknown };
// Adapter lifetimes are weak; string and opaque zones share one bounded LRU per adapter.
const caches = new WeakMap<object, Entry[]>();
const capacity = 32;

export function formatterFor<T, TZone>(
  adapter: DateAdapter<T, TZone>,
  zone: TZone,
  locale: Intl.LocalesArgument | undefined,
  options: Intl.DateTimeFormatOptions,
): ReturnType<DateAdapter<T, TZone>["createFormatter"]> {
  const locales = Intl.getCanonicalLocales(
    (locale === undefined ? [] : Array.isArray(locale) ? locale : [locale]).map(String),
  );
  const snapshot = { ...options };
  const key = JSON.stringify([
    locale === undefined ? null : locales,
    Object.entries(snapshot)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  ]);
  let entries = caches.get(adapter);
  if (!entries) {
    entries = [];
    caches.set(adapter, entries);
  }
  const index = entries.findIndex((entry) => Object.is(entry.zone, zone) && entry.key === key);
  if (index !== -1) {
    const entry = entries.splice(index, 1)[0]!;
    entries.push(entry);
    // Entries are only read through the same adapter that created them.
    return entry.formatter as ReturnType<DateAdapter<T, TZone>["createFormatter"]>;
  }
  const formatter = adapter.createFormatter(
    zone,
    locale === undefined ? undefined : locales,
    snapshot,
  );
  entries.push({ zone, key, formatter });
  if (entries.length > capacity) entries.shift();
  return formatter;
}
