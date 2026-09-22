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
];
