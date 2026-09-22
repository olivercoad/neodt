const systemLocale = new Intl.DateTimeFormat().resolvedOptions().locale;

export const locales = [
  ["", `System (${systemLocale})`],
  ["en-AU", "English (Australia)"],
  ["en-US", "English (United States)"],
  ["en-GB", "English (United Kingdom)"],
  ["de-DE", "Deutsch (Deutschland)"],
  ["fr-FR", "Francais (France)"],
  ["ja-JP", "Japanese (Japan)"],
];
