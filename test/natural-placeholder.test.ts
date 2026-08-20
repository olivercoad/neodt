import { describe, expect, it, vi } from "vitest";

import { createNaturalPlaceholder, naturalTextExamples } from "../src/natural-placeholder";

describe("natural text placeholder", () => {
  it("cycles through diverse supported input formats", () => {
    expect(naturalTextExamples).toEqual(
      expect.arrayContaining([
        "now",
        "tomorrow at 9:30am",
        "in 2 hours",
        "3 days ago",
        "last monday at 6pm",
        "8/4 at 14:30",
        "2027-03-01T09:15+11:00",
      ]),
    );
  });

  it("types, erases, and advances to the next example", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const onChange = vi.fn();
    const placeholder = createNaturalPlaceholder(onChange);

    placeholder.start();
    expect(onChange).toHaveBeenLastCalledWith("n");
    vi.advanceTimersByTime(45 * ("now".length - 1));
    expect(onChange).toHaveBeenLastCalledWith("now");
    vi.advanceTimersByTime(1_800 + 18 * "now".length + 300);
    expect(onChange).toHaveBeenLastCalledWith("t");

    placeholder.stop();
    expect(onChange).toHaveBeenLastCalledWith("");
    vi.useRealTimers();
  });

  it("starts the next example after user text is cleared", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const onChange = vi.fn();
    const placeholder = createNaturalPlaceholder(onChange);

    placeholder.start();
    expect(onChange).toHaveBeenLastCalledWith("n");
    placeholder.stop();
    placeholder.startNext();
    expect(onChange).toHaveBeenLastCalledWith("t");

    placeholder.stop();
  });

  it("starts at a random example for each animator", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const onChange = vi.fn();
    const placeholder = createNaturalPlaceholder(onChange);

    placeholder.start();
    expect(onChange).toHaveBeenLastCalledWith("d");

    placeholder.stop();
  });
});
