import { Temporal } from "temporal-polyfill";

import { createTemporalAdapter } from "../../src/adapters/temporal";
import { start } from "../start";
start("temporal-polyfill", createTemporalAdapter(Temporal), (id: string) => id);
