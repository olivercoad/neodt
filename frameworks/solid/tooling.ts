import solid from "vite-plugin-solid";

import type { FrameworkTooling } from "../tooling.ts";

export default {
  plugins: ({ mode, include }) =>
    mode === "consumer"
      ? [solid()]
      : [
          solid({
            ssr: mode === "development",
            include: [...include, "**/test/**"],
            hot: false,
            solid:
              mode === "development"
                ? undefined
                : { generate: mode === "server-test" ? "ssr" : "dom" },
          }),
        ],
} satisfies FrameworkTooling;
