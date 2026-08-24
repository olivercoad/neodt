import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.tsx"],
    platform: "neutral",
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
