import { inlineStyles } from "../inline-styles.ts";
import { generateComponent } from "../template-generator.ts";
import type { FrameworkTooling } from "../tooling.ts";
export default {
  generateComponent,
  build: {
    plugins: [inlineStyles()],
  },
  consumer: {
    extension: "ts",
    render: (generic, callback) =>
      `export const control = new Neodt${generic ? "<typeof referenceTime, typeof adapter extends import('@olicoad/neodt/lit/generic').DateAdapter<infer _T, infer Z> ? Z : never>" : ""}();
control.props = { ${generic ? "adapter," : ""} referenceTime, onValueChange: value => { ${callback}; } };
// @ts-expect-error Mixed datetime values must be rejected.
control.props = { ...control.props, value: "invalid" };`,
  },
} satisfies FrameworkTooling;
