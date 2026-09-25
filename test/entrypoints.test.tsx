import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Temporal as Ponyfill } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { frameworks, frameworkPackages } from "../frameworks";
import * as native from "../generated/solid/index";
import * as temporal from "../generated/solid/temporal-polyfill";
import { libraries, datetimePackages } from "../libraries";
import packageJson from "../package.json";
import { builtInAdapters } from "./helpers/adapters";
import { forEachConfiguredEntry, milliseconds } from "./helpers/entries";

forEachConfiguredEntry((name, entry, referenceTime, epoch, nativeEntry) => {
  type T = typeof referenceTime;
  describe(name, () => {
    if (nativeEntry) {
      beforeEach(() => vi.stubGlobal("Temporal", Ponyfill));
      afterEach(() => vi.unstubAllGlobals());
    }
    it("binds the parser to the selected implementation", () => {
      const result = entry.parseNaturalDate("in 1 hour", { referenceTime });
      expect(result).toBeInstanceOf((referenceTime as object).constructor);
      expect(epoch(result!)).toBe(milliseconds + 3_600_000);
      expect(entry.Neodt).toBe(entry.default);
    });

    it("edits, clears and responds to controlled replacements without an adapter prop", () => {
      const [value, setValue] = createSignal<T | null>(referenceTime);
      const Neodt = entry.default;
      const host = document.createElement("div");
      document.body.append(host);
      const dispose = render(
        () => <Neodt referenceTime={referenceTime} value={value()} onValueChange={setValue} />,
        host,
      );
      const hour = () => host.querySelector('[role="spinbutton"][aria-label="hour"]')!;
      try {
        hour().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
        expect(value()).toBeInstanceOf((referenceTime as object).constructor);
        expect(epoch(value()!)).toBe(milliseconds + 3_600_000);
        expect(epoch(referenceTime)).toBe(milliseconds);
        setValue(() => referenceTime);
        hour().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
        expect(epoch(value()!)).toBe(milliseconds + 3_600_000);
        hour().dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
        expect(value()).toBeNull();
      } finally {
        dispose();
        host.remove();
      }
    });
  });
});

it("resolves global Temporal lazily and never installs a polyfill", () => {
  const referenceTime =
    Ponyfill.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO("UTC");
  try {
    vi.stubGlobal("Temporal", undefined);
    expect(native.parseNaturalDate("now", { referenceTime })).toBeUndefined();
    expect(temporal.parseNaturalDate("now", { referenceTime })).toBeInstanceOf(
      Ponyfill.ZonedDateTime,
    );
    expect(globalThis.Temporal).toBeUndefined();
    vi.stubGlobal("Temporal", Ponyfill);
    const result = native.parseNaturalDate("in 1 hour", { referenceTime });
    expect(result).toBeInstanceOf(Ponyfill.ZonedDateTime);
    expect(result?.epochMilliseconds).toBe(milliseconds + 3_600_000);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("covers every configured library export in the unit and browser matrices", () => {
  const exports = Object.keys(packageJson.exports)
    .filter((path) => path.startsWith("./solid/") && path !== "./solid/generic")
    .map((path) => path.slice("./solid/".length))
    .sort();
  for (const framework of frameworks) {
    for (const library of libraries)
      expect(packageJson.exports).toHaveProperty(`./${framework.id}${library.entry}`);
  }
  expect(builtInAdapters.map(({ name }) => name).sort()).toEqual(exports);
  expect(libraries.map(({ id }) => id).sort()).toEqual([...exports, "native-temporal"].sort());
  const configured: string[] = [];
  forEachConfiguredEntry((name) => {
    configured.push(name);
  });
  expect(configured.sort()).toEqual([...exports, "native-temporal"].sort());
});

it("keeps dependency declarations and unique registrations consistent", () => {
  expect(new Set(libraries.map(({ id }) => id)).size).toBe(libraries.length);
  expect(new Set(libraries.map(({ entry }) => entry)).size).toBe(libraries.length);
  expect(Object.keys(packageJson.peerDependenciesMeta).sort()).toEqual(
    [...datetimePackages, ...frameworkPackages].sort(),
  );
  for (const library of libraries) {
    for (const name of [
      ...library.dependencies,
      ...library.typePackages,
      ...library.demoPackages,
    ]) {
      expect(packageJson.devDependencies, `${library.id}: ${name}`).toHaveProperty(name);
    }
  }
});
