import { describe, expect, it } from "vitest";

import { getNaturalDateCompletions } from "../src/natural-completion";

describe("getNaturalDateCompletions", () => {
  it("returns ordered case-preserving completions for a partial phrase", () => {
    expect(getNaturalDateCompletions("tom")).toEqual([
      { label: "tomorrow", insertText: "tomorrow" },
    ]);
    expect(getNaturalDateCompletions("NEXT F")).toEqual([
      { label: "next friday", insertText: "NEXT Friday" },
    ]);
  });

  it("does not offer holidays or range grammar", () => {
    expect(getNaturalDateCompletions("christmas e")).toEqual([]);
    expect(getNaturalDateCompletions("thank")).toEqual([]);
    expect(getNaturalDateCompletions("march 14 to ")).toEqual([]);
  });

  it("does not complete empty or already complete text", () => {
    expect(getNaturalDateCompletions("")).toEqual([]);
    expect(getNaturalDateCompletions("tomorrow")).toEqual([]);
  });
});
