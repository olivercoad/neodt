export const themes = [
  {
    id: "paper",
    name: "Paper & ink",
    description: "A warm surface, serif type, and a soft focus ring for editorial interfaces.",
    css: `.theme-paper {
  --datetime-neo-background: #fffcf5;
  --datetime-neo-foreground: #332b23;
  --datetime-neo-border: #b9aa92;
  --datetime-neo-focus: #916128;
  font-family: Georgia, serif;
  font-size: 18px;
  border-radius: 0.2rem;
  width: 100%;
}`,
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "A dark theme with a violet accent. Selection colours stay explicit and readable.",
    css: `.theme-midnight {
  --datetime-neo-background: #191b2a;
  --datetime-neo-foreground: #f0edf9;
  --datetime-neo-border: #62627d;
  --datetime-neo-focus: #b9a4ff;
  --datetime-neo-highlight-foreground: #191b2a;
  --datetime-neo-hover: #33314a;
  border-radius: 0.75rem;
  width: 100%;
}

.theme-midnight[data-readonly] {
  --datetime-neo-background: #252738;
  --datetime-neo-border: #62627d;
}`,
  },
  {
    id: "mint",
    name: "Room to breathe",
    description: "Larger type and shared segment padding keep both editing modes comfortable.",
    css: `.theme-mint {
  --datetime-neo-background: #eefaf3;
  --datetime-neo-foreground: #173c2c;
  --datetime-neo-border: #75a98b;
  --datetime-neo-focus: #22764b;
  --datetime-neo-segment-padding: 0.35rem 0.25rem;
  --datetime-neo-segment-line-height: 1.5;
  font-size: 18px;
  border-radius: 0.65rem;
  width: 100%;
}`,
  },
  {
    id: "compact",
    name: "Compact console",
    description: "Monospaced digits and tighter spacing for dense tables and tools.",
    css: `.theme-compact {
  --datetime-neo-background: #f2f5f9;
  --datetime-neo-foreground: #243649;
  --datetime-neo-border: #91a2b5;
  --datetime-neo-focus: #235bc4;
  --datetime-neo-segment-padding: 0.08rem 0.1rem;
  --datetime-neo-segment-line-height: 1.2;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  border-radius: 0;
  width: 100%;
}`,
  },
  {
    id: "super-compact",
    name: "Seamless super-compact",
    description:
      "Adapted from a real-world times grid: minimal spacing, a transparent surface, and a width of 110-240px. Designed for not showing time offset.",
    css: `.theme-super-compact {
  font-family: "Roboto Flex", sans-serif;
  font-size: 16px;
  line-height: normal;
  overflow: clip;
  width: 100%;
  min-width: 110px;
  max-width: 240px;
  --datetime-neo-border: #9ca3af;
  --datetime-neo-focus: #765271;
  --datetime-neo-focus-ring: color-mix(in srgb, var(--datetime-neo-focus) 33%, transparent);
  --datetime-neo-highlight: var(--datetime-neo-focus);
  --datetime-neo-highlight-foreground: #fff;
  --datetime-neo-hover: color-mix(in srgb, var(--datetime-neo-focus) 40%, transparent);
  --datetime-neo-background: transparent;
  --datetime-neo-foreground: currentColor;
  --datetime-neo-segment-line-height: 1;
  --datetime-neo-segment-padding: 0px;
  border-radius: 4px;

  &[data-readonly]:has(.datetime-neo__content[data-wrapped]) {
    /* Allow readonly fields to shrink to the size of their wrapped content. */
    min-width: max-content;
  }

  &[data-readonly] {
    --datetime-neo-border: transparent;
    --datetime-neo-background: transparent;
  }

  .datetime-neo__editor {
    padding: 2px 3px;
  }

  .datetime-neo__actions {
    margin-top: 0;
    margin-bottom: 0;
    padding: 0;
    padding-right: 2px;
    gap: 0;
  }

  .datetime-neo__natural-prefix {
    padding: 0;
    padding-right: 2px;
  }

  .datetime-neo__trigger {
    padding: 2px;

    span {
      text-box: unset;
    }
  }

  .datetime-neo__natural-result {
    display: none;
}`,
  },
];
