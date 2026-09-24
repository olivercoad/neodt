import spacetime from "spacetime";

import { createSpacetimeAdapter } from "../../src/adapters/spacetime";
import { start } from "../start";
start("spacetime", createSpacetimeAdapter(spacetime), (id: string) => id);
