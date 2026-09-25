import { describe, expect, it } from "vitest";

import { frameworks } from "../frameworks";
import type { ExampleOptions } from "../frameworks/examples";
import { libraries } from "../libraries";

const optionCases: { name: string; options: ExampleOptions }[] = [
  { name: "defaults", options: {} },
  { name: "locale only", options: { locale: "en-AU" } },
  { name: "24-hour format", options: { hour12: false } },
  { name: "false flags", options: { readonly: false, disabled: false, showTimeOffset: false } },
  {
    name: "all options",
    options: {
      locale: "en-AU",
      hour12: true,
      readonly: true,
      disabled: true,
      showTimeOffset: true,
    },
  },
];

describe.each(frameworks)("$label example formatting", (framework) => {
  const blankLineCount = (source: string) =>
    source.split("\n").filter((line) => !line.trim()).length;
  const baseline = framework.example(libraries.find((library) => library.imports)!);

  describe.each(libraries)("$id", (library) => {
    it.each(optionCases)("has no redundant blank lines with $name", ({ options }) => {
      const source = framework.example(library, options);

      expect(source).toBe(source.trim());
      expect(source).not.toMatch(/\n[\t ]*\n[\t ]*\n/);
      // Optional imports and props must not leave empty placeholder lines.
      expect(blankLineCount(source)).toBe(blankLineCount(baseline));
      expect(source).not.toMatch(/\n[\t ]*\n[\t ]*import\b/);
      for (const tag of source.matchAll(/<Neodt\b[\s\S]*?\/>/g)) {
        expect(tag[0]).not.toMatch(/\n[\t ]*\n/);
      }
    });
  });
});
