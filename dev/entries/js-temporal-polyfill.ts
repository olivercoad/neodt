import { Temporal } from "@js-temporal/polyfill";

import { createTemporalAdapter } from "../../src/adapters/temporal";
import { start } from "../start";
start("js-temporal-polyfill", createTemporalAdapter(Temporal), (id: string) => id);
