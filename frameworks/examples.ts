export interface ExampleLibrary {
  entry: string;
  imports: string;
  type: string;
  now: string;
}
export interface ExampleOptions {
  locale?: string;
  hour12?: boolean;
  showTimeOffset?: boolean;
  readonly?: boolean;
  disabled?: boolean;
}
export function jsxOptions(options: ExampleOptions) {
  return [
    options.locale ? `  locale="${options.locale}"` : "",
    options.hour12 === undefined ? "" : `  formatOptions={{ hour12: ${options.hour12} }}`,
    ...["showTimeOffset", "readonly", "disabled"]
      .filter((key) => options[key as keyof ExampleOptions])
      .map((key) => `  ${key}`),
  ].filter(Boolean);
}
