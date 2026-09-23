import { createElementSize } from "@solid-primitives/resize-observer";
import type { DateTime } from "luxon";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  Index,
  onCleanup,
  on,
  splitProps,
  type JSX,
} from "solid-js";

import {
  closestYear,
  digitLimit,
  isCompleteSegment,
  naturalPreview,
  nearestLeapYear,
  parseLocal,
  partsFor,
  placeholderFor,
  sameDateValue,
  segmentAria,
  segmentNames,
  splitDateAndTime,
  timeOffset,
  toLocalValue,
  type DisplayPart,
  type Segment,
  type SegmentName,
} from "./date-segments";
import { CalendarIcon, CancelIcon, ConfirmIcon, MagicIcon } from "./icons";
import { getNaturalDateCompletions } from "./natural-completion";
import { parseNaturalDate } from "./natural-parser";
import { createNaturalPlaceholder } from "./natural-placeholder";

import "./styles.css";

export interface NeodtProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Date and time used as the basis for empty values and two-digit years. */
  referenceTime: DateTime;
  /** The selected date and time. Pass `null` for a controlled empty value. */
  value?: DateTime | null;
  /** Initial value when the component is uncontrolled. */
  defaultValue?: DateTime;
  /** Locale used for the visible date and time. Defaults to the system locale. */
  locale?: Intl.LocalesArgument;
  /** Options affecting the visible locale formatting, such as `hour12` or `hourCycle`. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Shows the selected date's UTC offset beside the visible date and time. */
  showTimeOffset?: boolean;
  /** Icon displayed in the button that opens the browser's native date and time picker. */
  calendarIcon?: JSX.Element;
  /** Icon displayed in the button that opens natural-language date entry. */
  magicIcon?: JSX.Element;
  /** Prevents editing while retaining the displayed value. */
  readonly?: boolean;
  /** Prevents focus and editing. */
  disabled?: boolean;
  /** Called whenever the selected date and time changes, or `null` when cleared. */
  onValueChange?: (value: DateTime | null) => void;
  /** Inline styles use Solid’s object syntax so measured layout variables are preserved. */
  style?: JSX.CSSProperties;
}

const systemLocale = new Intl.DateTimeFormat().resolvedOptions().locale;

/** A locale-aware, keyboard-editable local date and time control for Solid SPAs. */
function Neodt(props: NeodtProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "referenceTime",
    "value",
    "defaultValue",
    "locale",
    "formatOptions",
    "showTimeOffset",
    "calendarIcon",
    "magicIcon",
    "onValueChange",
    "readonly",
    "class",
    "classList",
    "disabled",
    "aria-label",
  ]);
  const locale = () => local.locale ?? systemLocale;
  const hourFormat = createMemo(() =>
    new Intl.DateTimeFormat(locale(), {
      hour: "numeric",
      ...local.formatOptions,
    }).resolvedOptions(),
  );
  const [uncontrolledValue, setUncontrolledValue] = createSignal<DateTime | undefined>(
    local.defaultValue,
  );
  const [selected, setSelected] = createSignal(0);
  const [allSegmentsSelected, setAllSegmentsSelected] = createSignal(false);
  const [typed, setTyped] = createSignal<{ index: number; digits: string } | undefined>();
  const [naturalText, setNaturalText] = createSignal("");
  const [naturalPlaceholder, setNaturalPlaceholder] = createSignal("");
  const [naturalSuggestion, setNaturalSuggestion] = createSignal(0);
  const [naturalMode, setNaturalMode] = createSignal(false);
  const referenceZone = () => local.referenceTime.zone;
  const value = () =>
    (local.value === undefined ? uncontrolledValue() : (local.value ?? undefined))?.setZone(
      referenceZone(),
    );
  const [draftDate, setDraftDate] = createSignal(
    (value() ?? local.referenceTime.setZone(referenceZone())).startOf("minute"),
  );
  const nativeValue = () => toLocalValue(value() ?? draftDate());
  const [cleared, setCleared] = createSignal<Set<SegmentName>>(
    new Set(value() ? [] : segmentNames),
  );
  let previousControlledValue = local.value;
  let emittedValue: DateTime | null | undefined;
  createEffect(
    on(
      () => local.value,
      (controlledValue) => {
        if (sameDateValue(controlledValue, previousControlledValue)) return;
        previousControlledValue = controlledValue;
        const isEcho = sameDateValue(controlledValue, emittedValue);
        emittedValue = undefined;
        if (controlledValue === undefined || isEcho) return;
        setTyped(undefined);
        setAllSegmentsSelected(false);
        setDraftDate(
          (controlledValue ?? local.referenceTime).setZone(referenceZone()).startOf("minute"),
        );
        setCleared(new Set<SegmentName>(controlledValue ? [] : segmentNames));
      },
    ),
  );
  const segments = createMemo(() =>
    partsFor(
      toLocalValue(cleared().size ? draftDate() : (value() ?? draftDate())),
      referenceZone(),
      locale(),
      local.formatOptions,
    ),
  );
  const editableSegments = createMemo(() =>
    segments().filter((part): part is Segment => part.editable),
  );
  const dayPeriodLabels = createMemo(() => {
    const labelForHour = (hour: number) =>
      partsFor(
        `2001-02-03T${hour.toString().padStart(2, "0")}:05`,
        referenceZone(),
        locale(),
        local.formatOptions,
      ).find((part) => part.type === "dayPeriod")?.value;
    return { morning: labelForHour(4), afternoon: labelForHour(16) };
  });
  const segmentButtons: HTMLElement[] = [];
  const actionButtons: HTMLElement[] = [];
  const [activeItem, setActiveItem] = createSignal(0);
  const [control, setControl] = createSignal<HTMLSpanElement>();
  const [editor, setEditor] = createSignal<HTMLSpanElement>();
  const [editorHasHiddenEnd, setEditorHasHiddenEnd] = createSignal(false);
  const [wrap, setWrap] = createSignal(false);
  const [layoutChanging, setLayoutChanging] = createSignal(true);
  let nativeInput: HTMLInputElement | undefined;
  let naturalInput: HTMLInputElement | undefined;
  const [actions, setActions] = createSignal<HTMLSpanElement>();
  const actionSize =
    typeof ResizeObserver === "undefined" ? { width: 0 } : createElementSize(actions);
  const editorSize =
    typeof ResizeObserver === "undefined" ? { width: 0 } : createElementSize(editor);
  const controlSize =
    typeof ResizeObserver === "undefined" ? { width: 0 } : createElementSize(control);
  const [measurements, setMeasurements] = createSignal<HTMLSpanElement>();
  const measurementsSize =
    typeof ResizeObserver === "undefined" ? { width: 0 } : createElementSize(measurements);
  const nativeInputId = createUniqueId();
  let hasOpenedNaturalInput = false;
  const naturalPlaceholderAnimation = createNaturalPlaceholder(setNaturalPlaceholder);
  const naturalDate = createMemo(() =>
    parseNaturalDate(naturalText(), {
      referenceTime: local.referenceTime,
      zone: local.referenceTime.zone,
      locale: locale(),
    }),
  );
  const naturalCompletions = createMemo(() => getNaturalDateCompletions(naturalText()));
  const activeNaturalCompletion = createMemo(() => naturalCompletions()[naturalSuggestion()]);
  const displayedParts = createMemo(() => splitDateAndTime(segments()));
  // Day-period labels can be widest at midnight, midday, or late evening depending on the locale.
  const widestParts = createMemo(() =>
    [0, 12, 23].map((hour) =>
      splitDateAndTime(
        partsFor(
          `2088-12-28T${hour.toString().padStart(2, "0")}:59`,
          referenceZone(),
          locale(),
          local.formatOptions,
        ),
      ),
    ),
  );

  const updateEditorOverflow = () => {
    const element = editor();
    if (!element) return;
    setEditorHasHiddenEnd(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  };

  const revealSegment = (index: number) => {
    const element = editor();
    const segment = segmentButtons[index];
    if (!element || !segment) return;
    if (index === 0) {
      element.scrollLeft = 0;
      updateEditorOverflow();
      return;
    }
    const editorBounds = element.getBoundingClientRect();
    const segmentBounds = segment.getBoundingClientRect();
    const visibleRight = editorBounds.right - 40;
    if (segmentBounds.right > visibleRight) {
      element.scrollLeft += segmentBounds.right - visibleRight;
    } else if (segmentBounds.left < editorBounds.left) {
      element.scrollLeft += segmentBounds.left - editorBounds.left;
    }
    updateEditorOverflow();
  };

  createEffect(() => {
    void editorSize.width;
    void segments();
    void naturalMode();
    void naturalText();
    updateEditorOverflow();
  });

  createEffect(() => {
    void controlSize.width;
    void widestParts();
    void local.showTimeOffset;
    void measurements();
    void measurementsSize.width;
    queueMicrotask(() => {
      const availableWidth = control()?.clientWidth ?? 0;
      const requiredWidth = Math.max(
        0,
        ...[
          ...(measurements()?.querySelectorAll<HTMLElement>(".datetime-neo__measurement") ?? []),
        ].map((element) => element.scrollWidth),
      );
      setWrap(availableWidth > 0 && requiredWidth > availableWidth);
    });
  });

  let layoutSettledFrame: number | undefined;
  createEffect(() => {
    void actionSize.width;
    void wrap();
    setLayoutChanging(true);
    if (layoutSettledFrame !== undefined) cancelAnimationFrame(layoutSettledFrame);
    // Keep layout transitions disabled for a painted frame while measurements settle.
    layoutSettledFrame = requestAnimationFrame(() => {
      layoutSettledFrame = requestAnimationFrame(() => {
        layoutSettledFrame = undefined;
        setLayoutChanging(false);
      });
    });
  });
  onCleanup(() => {
    if (layoutSettledFrame !== undefined) cancelAnimationFrame(layoutSettledFrame);
  });

  const emitValue = (next: DateTime | undefined) => {
    if (local.value === undefined) setUncontrolledValue(next);
    emittedValue = next ?? null;
    local.onValueChange?.(next ?? null);
  };

  const isCleared = (segment: SegmentName) => cleared().has(segment);
  const displaySegmentValue = (index: number, segment: Segment) => {
    const pending = typed();
    return segment.type === "year" && pending?.index === index ? pending.digits : segment.value;
  };
  const hasClearedSegment = (segmentsToCheck = cleared()) =>
    editableSegments().some((segment) => segmentsToCheck.has(segment.type));

  const completeSegments = (date: DateTime, completed: readonly SegmentName[]) => {
    if (cleared().size === 0) {
      emitValue(date);
      return;
    }
    const nextCleared = new Set(cleared());
    for (const segment of completed) nextCleared.delete(segment);
    setCleared(nextCleared);
    emitValue(hasClearedSegment(nextCleared) ? undefined : date);
  };

  const commitTypedYear = () => {
    const pending = typed();
    if (pending?.digits.length === 2 && editableSegments()[pending.index]?.type === "year") {
      setSegment("year", `${closestYear(pending.digits, local.referenceTime)}`);
    }
    setTyped(undefined);
  };

  const clearSegments = (segments: readonly SegmentName[]) => {
    if (local.disabled || local.readonly) return;
    setTyped(undefined);
    if (value()) setDraftDate(value()!.startOf("minute"));
    setCleared((previous) => new Set([...previous, ...segments]));
    emitValue(undefined);
  };

  const selectSegment = (index: number, focus = false) => {
    if (local.disabled || local.readonly) return;
    setAllSegmentsSelected(false);
    const next = Math.max(0, Math.min(index, editableSegments().length - 1));
    const pending = typed();
    if (pending?.index !== next) commitTypedYear();
    setSelected(next);
    setActiveItem(next);
    revealSegment(next);
    if (focus) segmentButtons[next]?.focus();
  };

  const selectControlItem = (index: number, focus = false) => {
    const segmentCount = editableSegments().length;
    const next = Math.max(0, Math.min(index, segmentCount + actionButtons.length - 1));
    if (next < segmentCount) {
      selectSegment(next, focus);
      return;
    }
    setTyped(undefined);
    setActiveItem(next);
    if (focus) actionButtons[next - segmentCount]?.focus();
  };

  const navigateControl = (event: KeyboardEvent, index: number): boolean => {
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = index - 1;
        break;
      case "ArrowRight":
        next = index + 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = editableSegments().length + actionButtons.length - 1;
        break;
      default:
        return false;
    }
    event.preventDefault();
    selectControlItem(next, true);
    return true;
  };

  const changeSegment = (segment: SegmentName, amount: number) => {
    if (local.disabled || local.readonly) return;
    let date = (value() ?? draftDate()).startOf("minute");
    switch (segment) {
      case "year":
        date = date.plus({ years: amount });
        break;
      case "month":
        date = date.plus({ months: amount });
        break;
      case "day":
        // Retain a permissive backing date while month or year is hidden.
        if (date.day + amount < 1 || date.day + amount > (date.daysInMonth ?? 31)) {
          if (isCleared("month")) {
            // Reset to January as Jan has 31 days
            date = date.set({ month: 1 });
          } else if (isCleared("year") && (date.month === 2 || (date.month === 3 && amount < 0))) {
            date = date.set({ year: nearestLeapYear(date.year) });
          }
        }
        date = date.plus({ days: amount });
        break;
      case "hour":
        date = date.plus({ hours: amount });
        break;
      case "minute":
        date = date.plus({ minutes: amount });
        break;
      case "dayPeriod":
        date = date.plus({ hours: date.hour < 12 ? 12 : -12 });
        break;
    }
    setDraftDate(date);
    completeSegments(date, [segment]);
  };

  const setDayPeriod = (morning: boolean) => {
    if (local.disabled || local.readonly) return;
    const date = (value() ?? draftDate()).startOf("minute");
    if (date.hour < 12 !== morning) {
      changeSegment("dayPeriod", 1);
      return;
    }
    if (!isCleared("dayPeriod")) return;
    completeSegments(date, ["dayPeriod"]);
  };

  const dayPeriodForInput = (input: string) => {
    const normalizedInput = input.toLocaleLowerCase(locale());
    if (normalizedInput === "a") return true;
    if (normalizedInput === "p") return false;
    const labels = dayPeriodLabels();
    const matches = [
      { morning: true, label: labels.morning },
      { morning: false, label: labels.afternoon },
    ].filter(
      (candidate): candidate is { morning: boolean; label: string } =>
        candidate.label !== undefined &&
        candidate.label.toLocaleLowerCase(locale()).startsWith(normalizedInput),
    );
    return matches.length === 1 ? matches[0]!.morning : undefined;
  };

  const setSegment = (segment: SegmentName, digits: string) => {
    if (local.disabled || local.readonly || segment === "dayPeriod") return;
    const number = Number(digits);
    if (!Number.isFinite(number)) return;
    let date = (value() ?? draftDate()).startOf("minute");
    let setDayPeriodToPm = false;
    if (segment === "year" && number >= 1) date = date.set({ year: number });
    if (segment === "month" && number >= 1 && number <= 12) date = date.set({ month: number });
    if (segment === "day" && number >= 1 && number <= 31) {
      // Retain a valid backing date while its hidden segments are incomplete.
      if (isCleared("month")) date = date.set({ month: 1 });
      else if (isCleared("year") && date.month === 2 && number === 29)
        date = date.set({ year: nearestLeapYear(date.year) });
      if (number <= (date.daysInMonth ?? 31)) date = date.set({ day: number });
    }
    if (segment === "hour") {
      const { hour12 } = hourFormat();
      if (hour12 && number >= 1 && number <= 12)
        date = date.set({ hour: (date.hour >= 12 ? 12 : 0) + (number % 12) });
      if (hour12 && number >= 13 && number <= 23) {
        date = date.set({ hour: number });
        setDayPeriodToPm = true;
      }
      if (!hour12 && number >= 0 && number <= 23) date = date.set({ hour: number });
    }
    if (segment === "minute" && number >= 0 && number <= 59) date = date.set({ minute: number });
    setDraftDate(date);
    completeSegments(date, setDayPeriodToPm ? [segment, "dayPeriod"] : [segment]);
  };

  const openPicker = () => {
    if (local.disabled || local.readonly) return;
    nativeInput?.showPicker?.();
  };

  const openNaturalInput = () => {
    if (local.disabled || local.readonly) return;
    setNaturalText("");
    setNaturalSuggestion(0);
    setNaturalMode(true);
    if (hasOpenedNaturalInput) naturalPlaceholderAnimation.startNext();
    else naturalPlaceholderAnimation.start();
    hasOpenedNaturalInput = true;
    queueMicrotask(() => naturalInput?.focus());
  };

  const exitNaturalInput = () => {
    naturalPlaceholderAnimation.stop();
    setNaturalText("");
    setNaturalSuggestion(0);
    setNaturalMode(false);
    queueMicrotask(() => selectSegment(0, true));
  };

  const confirmNaturalInput = () => {
    const date = naturalDate();
    if (!date || local.disabled || local.readonly) return;
    setDraftDate(date);
    setCleared(new Set<SegmentName>());
    setTyped(undefined);
    emitValue(date);
    exitNaturalInput();
  };

  const updateNaturalText = (next: string) => {
    const hadText = Boolean(naturalText());
    setNaturalText(next);
    setNaturalSuggestion(0);
    if (next) naturalPlaceholderAnimation.stop();
    else if (hadText) naturalPlaceholderAnimation.startNext();
  };

  onCleanup(naturalPlaceholderAnimation.stop);

  const acceptNaturalCompletion = () => {
    const completion = activeNaturalCompletion();
    if (!completion) return false;
    updateNaturalText(completion.insertText);
    queueMicrotask(() => {
      naturalInput?.focus();
      naturalInput?.setSelectionRange(completion.insertText.length, completion.insertText.length);
    });
    return true;
  };

  const cycleNaturalCompletion = (direction: 1 | -1) => {
    const completions = naturalCompletions();
    if (!completions.length) return;
    setNaturalSuggestion(
      (current) => (current + direction + completions.length) % completions.length,
    );
  };

  const updateFromNativeInput = (next: string) => {
    if (local.disabled || local.readonly) return;
    if (
      next
        ? !hasClearedSegment() && value() && next === toLocalValue(value()!)
        : cleared().size === segmentNames.length
    )
      return;
    if (!next) {
      setCleared(new Set<SegmentName>(segmentNames));
      setTyped(undefined);
      emitValue(undefined);
      return;
    }
    const date = parseLocal(next, referenceZone());
    if (!date) return;
    setDraftDate(date.startOf("minute"));
    emitValue(date);
    setCleared(new Set<SegmentName>());
    setTyped(undefined);
  };

  const pasteDateTime = (event: ClipboardEvent) => {
    if (naturalMode() || local.disabled || local.readonly) return;
    const date = parseNaturalDate(event.clipboardData?.getData("text") ?? "", {
      referenceTime: local.referenceTime,
      zone: referenceZone(),
      locale: locale(),
    });
    if (!date) return;
    event.preventDefault();
    setAllSegmentsSelected(false);
    setDraftDate(date);
    setCleared(new Set<SegmentName>());
    setTyped(undefined);
    emitValue(date);
  };

  const copyDateTime = (event: ClipboardEvent) => {
    if (naturalMode()) return;
    const editor = event.currentTarget as HTMLSpanElement;
    const displayedValue = editor.querySelector(".datetime-neo__value");
    if (!displayedValue) return;
    const copiedValue = allSegmentsSelected()
      ? (displayedValue.textContent ?? "")
      : ((cleared().size ? draftDate() : (value() ?? draftDate())).toISO({
          precision: "minutes",
        }) ?? "");
    event.clipboardData?.setData("text/plain", copiedValue);
    event.preventDefault();
  };

  const matchesFollowingSeparator = (index: number, key: string) => {
    if (key.length !== 1) return false;
    let editableIndex = -1;
    for (const part of segments()) {
      if (part.editable) {
        editableIndex += 1;
        if (editableIndex > index) return false;
        continue;
      }
      if (editableIndex === index && part.value.includes(key)) return true;
    }
    return false;
  };

  const enterSegmentDigit = (index: number, segment: Segment, digit: string) => {
    const previous = typed()?.index === index ? (typed()?.digits ?? "") : "";
    const digits = `${previous}${digit}`.slice(-digitLimit(segment.type));
    setTyped({ index, digits });
    setSegment(segment.type, digits);
    const hour12 = hourFormat().hour12 ?? false;
    if (isCompleteSegment(segment.type, digits, hour12)) selectSegment(index + 1, true);
  };

  const onSegmentKeyDown = (event: KeyboardEvent, index: number, segment: Segment) => {
    if (local.disabled || local.readonly) return;
    // Let the segmented editor support select-all without selecting the whole page.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      setAllSegmentsSelected(true);
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      const backspaceEmptySegment = event.key === "Backspace" && isCleared(segment.type);
      if (allSegmentsSelected() || (backspaceEmptySegment && index === 0)) {
        clearSegments(segmentNames);
        selectSegment(0, true);
      } else if (backspaceEmptySegment) {
        clearSegments([editableSegments()[index - 1]!.type]);
        selectSegment(index - 1, true);
      } else {
        clearSegments([segment.type]);
      }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    setAllSegmentsSelected(false);
    if (event.key === " ") {
      event.preventDefault();
      openPicker();
      return;
    }
    if (event.key === "@") {
      event.preventDefault();
      openNaturalInput();
      return;
    }
    // Arrow keys traverse segments horizontally and adjust the selected value vertically.
    if (navigateControl(event, index)) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      if (isCleared(segment.type)) {
        completeSegments(draftDate(), [segment.type]);
      } else {
        changeSegment(segment.type, event.key === "ArrowUp" ? 1 : -1);
      }
      return;
    }
    // Numeric segments expose a decimal keyboard on mobile; its decimal key advances instead of
    // becoming editable content. The day-period segment uses a text keyboard for A/P input.
    if (segment.type !== "dayPeriod" && event.key === ".") {
      event.preventDefault();
      selectSegment(index + 1, true);
      return;
    }
    // Locale punctuation, such as /, . or :, also moves across the matching separator.
    if (matchesFollowingSeparator(index, event.key)) {
      event.preventDefault();
      selectSegment(index + 1, true);
      return;
    }
    // Accept locale-specific day-period labels. A partial label works only when unambiguous.
    const dayPeriod = segment.type === "dayPeriod" ? dayPeriodForInput(event.key) : undefined;
    if (dayPeriod !== undefined) {
      event.preventDefault();
      setDayPeriod(dayPeriod);
      return;
    }
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      enterSegmentDigit(index, segment, event.key);
    }
  };

  const onEmptyAreaClick = () => {
    if (naturalMode()) return;
    if (!window.getSelection()?.isCollapsed) return;
    selectSegment(0, true);
  };

  const renderPart = (part: () => DisplayPart) =>
    part().editable ? (
      (() => {
        let placeholder: HTMLSpanElement | undefined;
        const segment = () => part() as Segment;
        const aria = createMemo(() =>
          segmentAria(
            cleared().size ? draftDate() : (value() ?? draftDate()),
            segment().type,
            cleared(),
            hourFormat().hourCycle,
          ),
        );
        const index = () =>
          editableSegments().findIndex((candidate) => candidate.type === segment().type);
        return (
          <span
            ref={(element) => (segmentButtons[index()] = element)}
            class="datetime-neo__segment"
            classList={{
              "datetime-neo__segment--selected": selected() === index(),
              "datetime-neo__segment--all-selected": allSegmentsSelected(),
            }}
            role="spinbutton"
            contenteditable={!local.disabled && !local.readonly ? true : undefined}
            spellcheck={false}
            inputmode={segment().type === "dayPeriod" ? "text" : "decimal"}
            tabindex={
              local.disabled || local.readonly ? undefined : activeItem() === index() ? 0 : -1
            }
            aria-disabled={local.disabled || undefined}
            aria-label={part().type}
            aria-readonly={local.readonly || undefined}
            aria-valuenow={isCleared(segment().type) ? undefined : aria().value}
            aria-valuemin={aria().min}
            aria-valuemax={aria().max}
            aria-valuetext={
              isCleared(segment().type) ? "Empty" : displaySegmentValue(index(), segment())
            }
            aria-describedby={rest["aria-describedby"]}
            aria-invalid={rest["aria-invalid"]}
            onFocus={() => selectSegment(index())}
            onBlur={commitTypedYear}
            onClick={() => selectSegment(index())}
            onKeyDown={(event) => onSegmentKeyDown(event, index(), segment())}
            onInput={(event) => {
              const input = event.currentTarget;
              // `textContent` may be unchanged after an unhandled key, so use the
              // inserted character rather than accidentally re-entering its last digit.
              const enteredCharacter = event.data;
              const dayPeriod =
                segment().type === "dayPeriod" && enteredCharacter
                  ? dayPeriodForInput(enteredCharacter)
                  : undefined;
              if (dayPeriod !== undefined) {
                setDayPeriod(dayPeriod);
                return;
              }
              if (isCleared(segment().type) && placeholder) {
                placeholder.textContent = placeholderFor(segment().type);
                input.replaceChildren(placeholder);
              } else {
                input.textContent = displaySegmentValue(index(), segment());
              }
              if (segment().type !== "dayPeriod" && enteredCharacter === ".") {
                selectSegment(index() + 1, true);
                return;
              }
              if (/^\d$/.test(enteredCharacter ?? ""))
                enterSegmentDigit(index(), segment(), enteredCharacter!);
            }}
          >
            {isCleared(segment().type) ? (
              <span ref={(element) => (placeholder = element)} class="datetime-neo__placeholder">
                {placeholderFor(segment().type)}
              </span>
            ) : (
              displaySegmentValue(index(), segment())
            )}
          </span>
        );
      })()
    ) : (
      <span class="datetime-neo__separator" aria-hidden="true">
        {part().value}
      </span>
    );

  createEffect(() => {
    control()?.style.setProperty("--datetime-neo-actions-width", `${actionSize.width ?? 0}px`);
  });

  return (
    <span
      ref={setControl}
      {...rest}
      class={`datetime-neo ${local.class ?? ""}`}
      classList={local.classList}
      data-disabled={local.disabled ? "" : undefined}
      data-empty={value() ? undefined : ""}
      data-natural={naturalMode() ? "" : undefined}
      data-readonly={local.readonly ? "" : undefined}
      data-time-offset={local.showTimeOffset ? "" : undefined}
      data-layout-changing={layoutChanging() ? "" : undefined}
    >
      <span
        class="datetime-neo__content"
        data-natural={naturalMode() ? "" : undefined}
        data-time-offset={local.showTimeOffset ? "" : undefined}
        data-wrapped={wrap() ? "" : undefined}
      >
        <span
          ref={setEditor}
          class="datetime-neo__editor"
          role="group"
          aria-label={
            local["aria-label"] ?? (rest["aria-labelledby"] ? undefined : "Date and time")
          }
          aria-labelledby={rest["aria-labelledby"]}
          data-overflowing={editorHasHiddenEnd() ? "" : undefined}
          onScroll={updateEditorOverflow}
          onCopy={copyDateTime}
          onPaste={pasteDateTime}
          onKeyDown={(event) => {
            if (
              naturalMode() ||
              !(event.ctrlKey || event.metaKey) ||
              event.key.toLowerCase() !== "a"
            )
              return;
            event.preventDefault();
            setAllSegmentsSelected(true);
          }}
        >
          {naturalMode() ? (
            <>
              <span class="datetime-neo__natural-entry">
                <span class="datetime-neo__natural-prefix" aria-hidden="true">
                  <span>@</span>
                </span>
                <span class="datetime-neo__natural-field">
                  <input
                    ref={(element) => (naturalInput = element)}
                    class="datetime-neo__natural-input"
                    aria-label="Natural-language date and time"
                    readonly={local.readonly}
                    type="text"
                    value={naturalText()}
                    placeholder={naturalPlaceholder()}
                    disabled={local.disabled}
                    onInput={(event) => updateNaturalText(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        cycleNaturalCompletion(1);
                        return;
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        cycleNaturalCompletion(-1);
                        return;
                      }
                      if (
                        event.key === "Tab" &&
                        !event.shiftKey &&
                        event.currentTarget.selectionStart === event.currentTarget.value.length &&
                        acceptNaturalCompletion()
                      ) {
                        event.preventDefault();
                        return;
                      }
                      if (event.key === "Enter") {
                        event.preventDefault();
                        confirmNaturalInput();
                        return;
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        exitNaturalInput();
                        return;
                      }
                    }}
                  />
                  {activeNaturalCompletion() && (
                    <span class="datetime-neo__natural-ghost" aria-hidden="true">
                      <span class="datetime-neo__natural-ghost-typed">{naturalText()}</span>
                      {activeNaturalCompletion()!.insertText.slice(naturalText().length)}
                      <kbd>Tab</kbd>
                    </span>
                  )}
                </span>
              </span>
              <span class="datetime-neo__natural-result">
                <span class="datetime-neo__natural-preview" aria-live="polite">
                  {naturalDate()
                    ? naturalPreview(naturalDate()!, locale(), local.formatOptions)
                    : ""}
                </span>
              </span>
            </>
          ) : (
            <span class="datetime-neo__value">
              <Index each={[displayedParts().first, displayedParts().second]}>
                {(row) => (
                  <span class="datetime-neo__row">
                    <Index each={row()}>{renderPart}</Index>
                  </span>
                )}
              </Index>
            </span>
          )}
          {!naturalMode() && (
            <span class="datetime-neo__empty-area" aria-hidden="true" onClick={onEmptyAreaClick} />
          )}
        </span>
        {renderTrailing()}
      </span>
      <input
        ref={(element) => (nativeInput = element)}
        class="datetime-neo__native-input"
        id={nativeInputId}
        type="datetime-local"
        value={nativeValue()}
        disabled={local.disabled}
        readonly={local.readonly}
        tabindex={-1}
        aria-label="Date and time picker"
        onInput={(event) => updateFromNativeInput(event.currentTarget.value)}
        onChange={(event) => updateFromNativeInput(event.currentTarget.value)}
      />
      <span ref={setMeasurements} class="datetime-neo__measurements" aria-hidden="true">
        <Index each={widestParts()}>
          {(parts) => (
            <span class="datetime-neo__measurement">
              <span class="datetime-neo__editor">
                <span class="datetime-neo__value">
                  <Index each={[parts().first, parts().second]}>
                    {(row) => (
                      <span class="datetime-neo__row">
                        <Index each={row()}>
                          {(part) => (
                            <span
                              class={
                                part().editable
                                  ? "datetime-neo__segment"
                                  : "datetime-neo__separator"
                              }
                            >
                              {part().value}
                            </span>
                          )}
                        </Index>
                      </span>
                    )}
                  </Index>
                </span>
              </span>
              {renderTrailing(true)}
            </span>
          )}
        </Index>
      </span>
    </span>
  );

  function renderTrailing(measurement = false) {
    const offset = measurement
      ? referenceZone().isUniversal
        ? timeOffset(local.referenceTime)
        : { hours: "+88", minutes: ":88", hasZeroMinutes: false }
      : timeOffset(
          naturalMode()
            ? (naturalDate() ?? local.referenceTime)
            : cleared().size
              ? draftDate()
              : (value() ?? draftDate()),
        );

    return (
      (local.showTimeOffset || (!local.readonly && !local.disabled)) && (
        <span class="datetime-neo__trailing">
          {local.showTimeOffset && (
            <span class="datetime-neo__timezone" aria-hidden={!measurement || undefined}>
              <span>{offset.hours}</span>
              <span
                class="datetime-neo__timezone-minutes"
                data-zero={offset.hasZeroMinutes ? "" : undefined}
              >
                {offset.minutes}
              </span>
            </span>
          )}
          {!local.readonly && !local.disabled && (
            <span
              ref={(element) => {
                if (!measurement) setActions(element);
              }}
              class="datetime-neo__actions"
            >
              <button
                ref={(element) => {
                  if (!measurement) actionButtons[0] = element;
                }}
                class="datetime-neo__trigger"
                type="button"
                tabindex={measurement ? -1 : activeItem() === editableSegments().length ? 0 : -1}
                disabled={local.disabled}
                aria-label={
                  !measurement && naturalMode()
                    ? naturalDate()
                      ? "Confirm natural-language date"
                      : "Cancel natural-language date"
                    : "Enter date and time naturally"
                }
                onFocus={measurement ? undefined : () => setActiveItem(editableSegments().length)}
                onKeyDown={
                  measurement
                    ? undefined
                    : (event) => navigateControl(event, editableSegments().length)
                }
                onClick={
                  measurement
                    ? undefined
                    : () =>
                        naturalMode()
                          ? naturalDate()
                            ? confirmNaturalInput()
                            : exitNaturalInput()
                          : openNaturalInput()
                }
              >
                {naturalMode() ? (
                  naturalDate() ? (
                    <ConfirmIcon />
                  ) : (
                    <CancelIcon />
                  )
                ) : (
                  (local.magicIcon ?? <MagicIcon />)
                )}
              </button>
              {!naturalMode() && (
                <label
                  ref={(element) => {
                    if (!measurement) actionButtons[1] = element;
                  }}
                  class="datetime-neo__trigger"
                  for={nativeInputId}
                  tabindex={
                    measurement ? -1 : activeItem() === editableSegments().length + 1 ? 0 : -1
                  }
                  aria-label="Open date and time picker"
                  onFocus={
                    measurement ? undefined : () => setActiveItem(editableSegments().length + 1)
                  }
                  onClick={measurement ? undefined : openPicker}
                  onKeyDown={
                    measurement
                      ? undefined
                      : (event) => {
                          if (event.key === " " || event.key === "Enter") {
                            event.preventDefault();
                            openPicker();
                            return;
                          }
                          navigateControl(event, editableSegments().length + 1);
                        }
                  }
                >
                  {local.calendarIcon ?? <CalendarIcon />}
                </label>
              )}
            </span>
          )}
        </span>
      )
    );
  }
}

export { Neodt };
export default Neodt;
export { getNaturalDateCompletions } from "./natural-completion";
export { parseNaturalDate } from "./natural-parser";
export type { NaturalDateCompletion } from "./natural-completion";
export type { NaturalDateParseOptions } from "./natural-parser";
