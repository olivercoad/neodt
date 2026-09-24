/** Parse fixed-offset syntax only; named-zone rules belong to datetime libraries. */
export function fixedOffset(zone: string): number | undefined {
  if (/^(UTC|GMT|Z)$/i.test(zone)) return 0;
  const match = zone.match(/^(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return undefined;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  if (hours > 23 || minutes > 59) throw new RangeError(`Invalid zone: ${zone}`);
  return (match[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
}
export function offsetZone(offset: number): string {
  const absolute = Math.abs(Math.round(offset));
  return `${offset < 0 ? "-" : "+"}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}
