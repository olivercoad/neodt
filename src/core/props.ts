import type { DateAdapter } from "../adapter";

export interface CoreProps<T, TZone = string> {
  adapter: DateAdapter<T, TZone>;
  /** Date and time used as the basis for empty values and two-digit years. */
  referenceTime: NoInfer<T>;
  /** The selected date and time. Pass `null` for a controlled empty value. */
  value?: NoInfer<T> | null;
  /** Initial value when the component is uncontrolled. */
  defaultValue?: NoInfer<T>;
  /** Locale used for the visible date and time. Defaults to the system locale. */
  locale?: Intl.LocalesArgument;
  /** Options affecting the visible locale formatting, such as `hour12` or `hourCycle`. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Shows the selected date's UTC offset beside the visible date and time. */
  showTimeOffset?: boolean;
  /** Prevents editing while retaining the displayed value. */
  readonly?: boolean;
  /** Prevents focus and editing. */
  disabled?: boolean;
  /** Called whenever the selected date and time changes, or `null` when cleared. */
  onValueChange?: (value: NoInfer<T> | null) => void;
}
