import { CalendarDate as DateTime, calendarDate } from "../calendar";
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
} from "../date-segments";
import { getNaturalDateCompletions } from "../natural-completion";
import { parseInternalDate } from "../natural-parser";
import { createNaturalPlaceholder } from "../natural-placeholder";
import type { CoreProps } from "./props";

function createSignal<T = undefined>(
  initial?: T,
): [() => T, (next: T | ((previous: T) => T)) => void] {
  let current = initial as T;
  return [
    () => current,
    (next) => {
      current = typeof next === "function" ? (next as (previous: T) => T)(current) : next;
    },
  ];
}
const createMemo = <T>(read: () => T) => read;

type InternalProps = Omit<CoreProps<DateTime>, "adapter"> & {
  id: string;
  describedBy?: string;
  invalid?: "true" | "false" | "grammar" | "spelling" | boolean;
  label?: string;
  labelledBy?: string;
};

/** Synchronous editing model. Frameworks subscribe to immutable presentation snapshots. */
function createEditor(initial: InternalProps) {
  let local = initial;
  const listeners = new Set<() => void>();
  let disposed = false;
  const locale = () => local.locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
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
  const referenceDate = () => local.referenceTime;
  const value = () =>
    (local.value === undefined ? uncontrolledValue() : (local.value ?? undefined))?.inZoneOf(
      referenceDate(),
    );
  const [draftDate, setDraftDate] = createSignal(
    (value() ?? local.referenceTime).startOf("minute"),
  );
  const nativeValue = () => toLocalValue(value() ?? draftDate());
  const [cleared, setCleared] = createSignal<Set<SegmentName>>(
    new Set(value() ? [] : segmentNames),
  );
  let previousControlledValue = local.value;
  let emittedValue: DateTime | null | undefined;
  const reconcile = () => {
    const controlledValue = local.value;
    if (sameDateValue(controlledValue, previousControlledValue)) return;
    previousControlledValue = controlledValue;
    const isEcho = sameDateValue(controlledValue, emittedValue);
    emittedValue = undefined;
    if (controlledValue === undefined || isEcho) return;
    setTyped(undefined);
    setAllSegmentsSelected(false);
    setDraftDate(
      (controlledValue ?? local.referenceTime).inZoneOf(referenceDate()).startOf("minute"),
    );
    setCleared(new Set<SegmentName>(controlledValue ? [] : segmentNames));
  };
  const segments = createMemo(() =>
    partsFor(
      toLocalValue(cleared().size ? draftDate() : (value() ?? draftDate())),
      referenceDate(),
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
        referenceDate(),
        locale(),
        local.formatOptions,
      ).find((part) => part.type === "dayPeriod")?.value;
    return { morning: labelForHour(4), afternoon: labelForHour(16) };
  });
  let root: HTMLSpanElement | undefined;
  const editor = () =>
    root?.querySelector<HTMLSpanElement>(".datetime-neo__content .datetime-neo__editor");
  const segmentButtons = () => [
    ...(editor()?.querySelectorAll<HTMLElement>('[role="spinbutton"]') ?? []),
  ];
  const actionButtons = () => [
    ...(root?.querySelectorAll<HTMLElement>(".datetime-neo__content .datetime-neo__trigger") ?? []),
  ];
  const naturalInput = () => root?.querySelector<HTMLInputElement>(".datetime-neo__natural-input");
  const nativeInput = () => root?.querySelector<HTMLInputElement>(".datetime-neo__native-input");
  const [activeItem, setActiveItem] = createSignal(0);
  const [editorHasHiddenEnd, setEditorHasHiddenEnd] = createSignal(false);
  const [wrap, setWrap] = createSignal(false);
  const [layoutChanging, setLayoutChanging] = createSignal(true);
  let hasOpenedNaturalInput = false;
  const naturalPlaceholderAnimation = createNaturalPlaceholder((text) => {
    setNaturalPlaceholder(text);
    publish();
  });
  const naturalDate = createMemo(() =>
    parseInternalDate(naturalText(), {
      referenceTime: local.referenceTime,
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
          referenceDate(),
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
    const segment = segmentButtons()[index];
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
    if (focus) segmentButtons()[next]?.focus();
  };

  const selectControlItem = (index: number, focus = false) => {
    const segmentCount = editableSegments().length;
    const next = Math.max(0, Math.min(index, segmentCount + actionButtons().length - 1));
    if (next < segmentCount) {
      selectSegment(next, focus);
      return;
    }
    setTyped(undefined);
    setActiveItem(next);
    if (focus) actionButtons()[next - segmentCount]?.focus();
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
        next = editableSegments().length + actionButtons().length - 1;
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
            date = date.set({ year: nearestLeapYear(date.year, date) });
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
        date = date.set({ year: nearestLeapYear(date.year, date) });
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
    nativeInput()?.showPicker?.();
  };

  const openNaturalInput = () => {
    if (local.disabled || local.readonly) return;
    setNaturalText("");
    setNaturalSuggestion(0);
    setNaturalMode(true);
    if (hasOpenedNaturalInput) naturalPlaceholderAnimation.startNext();
    else naturalPlaceholderAnimation.start();
    hasOpenedNaturalInput = true;
    queueMicrotask(() => naturalInput()?.focus());
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

  const acceptNaturalCompletion = () => {
    const completion = activeNaturalCompletion();
    if (!completion) return false;
    updateNaturalText(completion.insertText);
    queueMicrotask(() => {
      naturalInput()?.focus();
      naturalInput()?.setSelectionRange(completion.insertText.length, completion.insertText.length);
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
    const date = parseLocal(next, referenceDate());
    if (!date) return;
    setDraftDate(date.startOf("minute"));
    emitValue(date);
    setCleared(new Set<SegmentName>());
    setTyped(undefined);
  };

  const pasteDateTime = (event: ClipboardEvent) => {
    if (naturalMode() || local.disabled || local.readonly) return;
    const date = parseInternalDate(event.clipboardData?.getData("text") ?? "", {
      referenceTime: local.referenceTime,
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
      : ((cleared().size ? draftDate() : (value() ?? draftDate())).toISO() ?? "");
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

  const isControlGap = (event: MouseEvent & { target: Element }) => {
    // Segments, action icons, and inputs handle their own clicks, including clicks
    // on their descendants. All remaining space belongs to the active editor.
    return (
      !event.defaultPrevented &&
      !local.disabled &&
      !local.readonly &&
      !event.target.closest(".datetime-neo__segment, .datetime-neo__trigger, input")
    );
  };

  const focusEditor = (event: MouseEvent & { target: Element }) => {
    if (naturalMode()) {
      naturalInput()?.focus();
      return;
    }
    let nearest = 0;
    if (event.target.closest(".datetime-neo__value")) {
      let nearestDistance = Infinity;
      editableSegments().forEach((_, index) => {
        const bounds = segmentButtons()[index]?.getBoundingClientRect();
        if (!bounds) return;
        // Measure from the segment's edges so both wide labels and wrapped rows
        // choose the segment visually closest to the pointer.
        const dx = Math.max(bounds.left - event.clientX, 0, event.clientX - bounds.right);
        const dy = Math.max(bounds.top - event.clientY, 0, event.clientY - bounds.bottom);
        const distance = dx * dx + dy * dy;
        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      });
    }
    selectSegment(nearest, true);
  };

  const onControlMouseDown = (event: MouseEvent & { target: Element }) => {
    if (event.button !== 0 || !isControlGap(event)) return;
    // Otherwise the browser places the caret in the nearest contenteditable
    // segment before the click handler runs, briefly highlighting that segment.
    event.preventDefault();
    focusEditor(event);
  };

  const onControlClick = (event: MouseEvent & { target: Element }) => {
    if (!isControlGap(event) || !window.getSelection()?.isCollapsed) return;
    focusEditor(event);
  };

  const partView = (part: DisplayPart, position: number) => {
    if (!part.editable)
      return { key: `separator-${position}`, editable: false as const, text: part.value };
    const index = editableSegments().findIndex((candidate) => candidate.type === part.type);
    const aria = segmentAria(
      cleared().size ? draftDate() : (value() ?? draftDate()),
      part.type,
      cleared(),
      hourFormat().hourCycle,
    );
    const empty = isCleared(part.type);
    return {
      key: part.type,
      editable: true as const,
      index,
      type: part.type,
      empty,
      text: empty ? placeholderFor(part.type) : displaySegmentValue(index, part),
      selected: selected() === index,
      allSelected: allSegmentsSelected(),
      tabIndex: local.disabled || local.readonly ? undefined : activeItem() === index ? 0 : -1,
      min: aria.min,
      max: aria.max,
      now: empty ? undefined : aria.value,
      valueText: empty ? "Empty" : displaySegmentValue(index, part),
    };
  };
  const snapshot = () => {
    const parts = displayedParts();
    const date = naturalDate();
    return {
      id: local.id,
      disabled: !!local.disabled,
      readonly: !!local.readonly,
      empty: !value(),
      natural: naturalMode(),
      wrapped: wrap(),
      overflowing: editorHasHiddenEnd(),
      layoutChanging: layoutChanging(),
      showTimeOffset: !!local.showTimeOffset,
      label: local.label ?? (local.labelledBy ? undefined : "Date and time"),
      labelledBy: local.labelledBy,
      describedBy: local.describedBy,
      invalid: local.invalid,
      rowIndexes: [0, 1],
      rowKeys: [parts.first.map(partView), parts.second.map(partView)].map((row) =>
        row.map((part) => part.key),
      ),
      rows: [parts.first.map(partView), parts.second.map(partView)],
      partRows: [parts.first.map(partView), parts.second.map(partView)].map((row) =>
        Object.fromEntries(row.map((part) => [part.key, part])),
      ),
      measurements: widestParts().map((parts) => [parts.first, parts.second]),
      nativeValue: nativeValue(),
      naturalText: naturalText(),
      placeholder: naturalPlaceholder(),
      completion: activeNaturalCompletion()?.insertText.slice(naturalText().length) ?? "",
      preview: date ? naturalPreview(date, locale(), local.formatOptions) : "",
      canConfirm: !!date,
      activeItem: activeItem(),
      segmentCount: editableSegments().length,
      offset: timeOffset(
        naturalMode()
          ? (date ?? local.referenceTime)
          : cleared().size
            ? draftDate()
            : (value() ?? draftDate()),
      ),
      measuredOffset: local.referenceTime.isOffsetFixed
        ? timeOffset(local.referenceTime)
        : { hours: "+88", minutes: ":88", hasZeroMinutes: false },
    };
  };
  let current = snapshot();
  function publish() {
    if (disposed) return;
    current = snapshot();
    for (const listener of listeners) listener();
  }
  let observer: ResizeObserver | undefined;
  let frame: number | undefined;
  let settleFrame: number | undefined;
  let lastActionsWidth = -1;
  const cleanups: (() => void)[] = [];
  const measure = () => {
    if (!root) return;
    const beforeOverflow = editorHasHiddenEnd();
    const focusedIndex = segmentButtons().indexOf(root.ownerDocument.activeElement as HTMLElement);
    if (focusedIndex >= 0) revealSegment(focusedIndex);
    else updateEditorOverflow();
    const width = root.clientWidth;
    const actionsWidth =
      root
        .querySelector<HTMLElement>(".datetime-neo__content .datetime-neo__actions")
        ?.getBoundingClientRect().width ?? 0;
    // The hidden tree subtracts the actions width. Apply the current width before
    // reading it, especially when switching between one and two action buttons.
    if (lastActionsWidth !== actionsWidth)
      root.style.setProperty("--datetime-neo-actions-width", `${actionsWidth}px`);
    const required = Math.max(
      0,
      ...[...root.querySelectorAll<HTMLElement>(".datetime-neo__measurement")].map(
        (element) => element.scrollWidth,
      ),
    );
    const nextWrap = width > 0 && required > width;
    const layoutChanged = nextWrap !== wrap() || lastActionsWidth !== actionsWidth;
    if (layoutChanged) {
      setWrap(nextWrap);
      lastActionsWidth = actionsWidth;
      setLayoutChanging(true);
      if (settleFrame !== undefined) cancelAnimationFrame(settleFrame);
      settleFrame = requestAnimationFrame(() => {
        settleFrame = requestAnimationFrame(() => {
          settleFrame = undefined;
          setLayoutChanging(false);
          publish();
        });
      });
    }
    if (layoutChanged || beforeOverflow !== editorHasHiddenEnd()) publish();
  };
  const afterRender = () => {
    if (!root || frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      measure();
    });
  };
  const placeholders = new WeakMap<HTMLElement, HTMLSpanElement>();
  const rememberPlaceholders = () => {
    for (const segment of segmentButtons()) {
      const placeholder = segment.querySelector<HTMLSpanElement>(".datetime-neo__placeholder");
      if (placeholder) placeholders.set(segment, placeholder);
    }
  };
  const run = (action: () => void) => {
    action();
    publish();
    rememberPlaceholders();
    afterRender();
  };
  const segmentInput = (event: InputEvent, index: number, segment: Segment) => {
    const input = event.target as HTMLElement;
    const enteredCharacter = event.data;
    const dayPeriod =
      segment.type === "dayPeriod" && enteredCharacter
        ? dayPeriodForInput(enteredCharacter)
        : undefined;
    // Restore the existing rendered nodes before the framework reconciles the next snapshot.
    const placeholder =
      input.querySelector<HTMLSpanElement>(".datetime-neo__placeholder") ?? placeholders.get(input);
    if (isCleared(segment.type) && placeholder) {
      placeholder.textContent = placeholderFor(segment.type);
      input.replaceChildren(placeholder);
    } else input.textContent = displaySegmentValue(index, segment);
    if (dayPeriod !== undefined) setDayPeriod(dayPeriod);
    else if (segment.type !== "dayPeriod" && enteredCharacter === ".")
      selectSegment(index + 1, true);
    else if (/^\d$/.test(enteredCharacter ?? ""))
      enterSegmentDigit(index, segment, enteredCharacter!);
  };
  const dispatch = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest || target.closest(".datetime-neo__measurements")) return;
    const segmentElement = target.closest<HTMLElement>('[role="spinbutton"]');
    const index = segmentElement ? segmentButtons().indexOf(segmentElement) : -1;
    const segment = editableSegments()[index];
    if (event.type === "focusin") {
      if (segment) selectSegment(index);
      else {
        const action = target.closest<HTMLElement>(".datetime-neo__trigger");
        if (action) setActiveItem(editableSegments().length + actionButtons().indexOf(action));
      }
    } else if (event.type === "focusout" && segment) commitTypedYear();
    else if (event.type === "keydown") {
      const key = event as KeyboardEvent;
      if (target === naturalInput()) {
        if (key.key === "ArrowDown" || key.key === "ArrowUp") {
          key.preventDefault();
          cycleNaturalCompletion(key.key === "ArrowDown" ? 1 : -1);
        } else if (
          key.key === "Tab" &&
          !key.shiftKey &&
          naturalInput()?.selectionStart === naturalText().length &&
          acceptNaturalCompletion()
        )
          key.preventDefault();
        else if (key.key === "Enter") {
          key.preventDefault();
          confirmNaturalInput();
        } else if (key.key === "Escape") {
          key.preventDefault();
          exitNaturalInput();
        }
      } else if (segment) onSegmentKeyDown(key, index, segment);
      else if (target.closest(".datetime-neo__trigger")) {
        if (target.tagName === "LABEL" && (key.key === " " || key.key === "Enter")) {
          key.preventDefault();
          openPicker();
        } else navigateControl(key, activeItem());
      } else if (!naturalMode() && (key.ctrlKey || key.metaKey) && key.key.toLowerCase() === "a") {
        key.preventDefault();
        setAllSegmentsSelected(true);
      }
    } else if (event.type === "input" || event.type === "change") {
      if (target === nativeInput()) updateFromNativeInput((target as HTMLInputElement).value);
      else if (target === naturalInput()) updateNaturalText((target as HTMLInputElement).value);
      else if (segment && event.type === "input") segmentInput(event as InputEvent, index, segment);
    } else if (event.type === "copy") {
      // Delegated listener's currentTarget is the root, which also contains the visible value.
      copyDateTime(event as ClipboardEvent);
    } else if (event.type === "paste") pasteDateTime(event as ClipboardEvent);
    else if (event.type === "scroll") updateEditorOverflow();
  };
  const unmount = () => {
    disposed = true;
    observer?.disconnect();
    observer = undefined;
    for (const cleanup of cleanups.splice(0)) cleanup();
    naturalPlaceholderAnimation.stop();
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (settleFrame !== undefined) cancelAnimationFrame(settleFrame);
    frame = settleFrame = undefined;
    root = undefined;
  };
  return {
    getSnapshot: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(next: InternalProps) {
      const previous = local;
      local = next;
      const changed =
        !sameDateValue(next.referenceTime, previous.referenceTime) ||
        !sameDateValue(next.value, previous.value) ||
        [
          "locale",
          "formatOptions",
          "showTimeOffset",
          "disabled",
          "readonly",
          "id",
          "label",
          "labelledBy",
          "describedBy",
          "invalid",
        ].some((key) => next[key as keyof InternalProps] !== previous[key as keyof InternalProps]);
      if (!changed) return;
      reconcile();
      publish();
      afterRender();
    },
    mount(element: HTMLSpanElement) {
      if (root === element) return;
      root = element;
      rememberPlaceholders();
      disposed = false;
      const listener = (event: Event) => run(() => dispatch(event));
      for (const type of [
        "focusin",
        "focusout",
        "keydown",
        "input",
        "change",
        "copy",
        "paste",
        "scroll",
      ]) {
        root.addEventListener(type, listener, type === "scroll");
        cleanups.push(() => element.removeEventListener(type, listener, type === "scroll"));
      }
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(afterRender);
        for (const element of [
          root,
          ...root.querySelectorAll<HTMLElement>(
            ".datetime-neo__editor, .datetime-neo__actions, .datetime-neo__measurements",
          ),
        ])
          observer.observe(element);
      }
      queueMicrotask(measure);
      afterRender();
    },
    afterRender,
    unmount,
    click(event: MouseEvent) {
      run(() => {
        const target = event.target as HTMLElement;
        if (event.defaultPrevented || target.closest(".datetime-neo__measurements")) return;
        const action = target.closest(".datetime-neo__trigger");
        if (action?.tagName === "LABEL") openPicker();
        else if (action) {
          if (naturalMode()) {
            if (naturalDate()) confirmNaturalInput();
            else exitNaturalInput();
          } else openNaturalInput();
        } else onControlClick(event as MouseEvent & { target: Element });
      });
    },
    mouseDown(event: MouseEvent) {
      run(() => onControlMouseDown(event as MouseEvent & { target: Element }));
    },
  };
}

export type EditorController = ReturnType<typeof createEditor>;
export type EditorView = ReturnType<EditorController["getSnapshot"]>;
export type PartView = EditorView["rows"][number][number];
export type ControllerProps<T, TZone> = CoreProps<T, TZone> &
  Pick<InternalProps, "id" | "label" | "labelledBy" | "describedBy" | "invalid">;

export function createController<T, TZone>(props: ControllerProps<T, TZone>) {
  const convert = (props: ControllerProps<T, TZone>, initial = false): InternalProps => ({
    ...props,
    referenceTime: calendarDate(props.adapter, props.referenceTime),
    value:
      props.value === undefined
        ? undefined
        : props.value === null
          ? null
          : calendarDate(props.adapter, props.value),
    defaultValue:
      !initial || props.defaultValue === undefined
        ? undefined
        : calendarDate(props.adapter, props.defaultValue),
    onValueChange: (value) =>
      props.onValueChange?.(
        value === null
          ? null
          : props.adapter.fromEpochMilliseconds(
              value.milliseconds,
              props.adapter.getZone(props.referenceTime),
            ),
      ),
  });
  const controller = createEditor(convert(props, true));
  return {
    ...controller,
    update: (props: ControllerProps<T, TZone>) => controller.update(convert(props)),
  };
}
