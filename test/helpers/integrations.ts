/// <reference types="vite/client" />
import { libraries } from "../../libraries";
import type { defineIntegration } from "../../src/integration";

// Modules expose a generic visitor, retaining native value and zone type pairs.
const modules = import.meta.glob<{ integration: ReturnType<typeof defineIntegration> }>(
  "../../src/libraries/*.ts",
);
export const integrations = await Promise.all(
  libraries.map(async (library) => {
    const load = modules[`../../${library.source}`];
    if (!load) throw new Error(`Missing integration: ${library.source}`);
    const { integration } = await load();
    await integration.setup();
    return { ...library, ...integration };
  }),
);
