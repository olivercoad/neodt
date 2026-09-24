import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: [
      "src/index.tsx",
      "src/generic.tsx",
      "src/luxon.tsx",
      "src/moment.tsx",
      "src/dayjs.tsx",
      "src/date-fns.tsx",
      "src/spacetime.tsx",
      "src/internationalized-date.tsx",
      "src/temporal-polyfill.tsx",
      "src/js-temporal-polyfill.tsx",
      "src/adapters/*.ts",
    ],
    platform: "neutral",
    deps: {
      neverBundle: [
        "luxon",
        "moment",
        "dayjs",
        "date-fns",
        "spacetime",
        "@internationalized/date",
        "temporal-polyfill",
        "@js-temporal/polyfill",
      ],
    },
    css: {
      inject: true,
    },
    // don't process solid, just export preserved jsx and let the consumer
    // do the solid transformation
    // plugins: [solid()],
    exports: {
      legacy: false,
    },
    outExtensions: () => {
      return { js: ".jsx" };
    },
  },
]);
