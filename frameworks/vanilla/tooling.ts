import { inlineStyles } from "../inline-styles.ts";
import { generateComponent } from "../template-generator.ts";
import type { FrameworkTooling } from "../tooling.ts";

export default {
  generateComponent: (component) => generateComponent(component, "lit-html"),
  build: {
    plugins: [inlineStyles()],
    deps: { alwaysBundle: [/^lit-html(?:\/|$)/] },
    // lit-html's Node entry retains DOM rendering but guards document access at import time.
    inputOptions: { resolve: { conditionNames: ["node", "import"] } },
  },
  consumer: {
    extension: "ts",
    render: (generic, callback) => `const container = document.createElement("div");
export const control = Neodt(container, { ${generic ? "adapter," : ""} referenceTime, onValueChange: value => { ${callback}; } });
control.update({ value: referenceTime });
// @ts-expect-error Mixed datetime values must be rejected.
Neodt(container, { ${generic ? "adapter," : ""} referenceTime, value: "invalid" });
// @ts-expect-error Updates must retain the selected datetime type.
control.update({ value: "invalid" });
control.destroy();`,
  },
} satisfies FrameworkTooling;
