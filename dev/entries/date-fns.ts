import { toDate } from "date-fns/toDate";

import { createDateFnsAdapter } from "../../src/adapters/date-fns";
import { start } from "../start";
start("date-fns", createDateFnsAdapter(toDate), (id: string) => id);
