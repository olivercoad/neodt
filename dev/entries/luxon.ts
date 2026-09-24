import { DateTime } from "luxon";

import { createLuxonAdapter } from "../../src/adapters/luxon";
import { start } from "../start";
start("luxon", createLuxonAdapter(DateTime), (id: string) => DateTime.now().setZone(id).zone);
