import moment from "moment-timezone";

import { createMomentAdapter } from "../../src/adapters/moment";
import { start } from "../start";
start("moment", createMomentAdapter(moment), (id: string) => id);
