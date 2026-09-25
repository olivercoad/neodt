import type { UserConfig } from "tsdown";
export default {
  banner: { js: '"use client";' },
  inputOptions: { transform: { jsx: { runtime: "automatic", importSource: "react" } } },
  outExtensions: () => ({ js: ".js" }),
} satisfies UserConfig;
