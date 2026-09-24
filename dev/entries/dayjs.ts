import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

import { createDayjsAdapter } from "../../src/adapters/dayjs";
dayjs.extend(utc);
dayjs.extend(timezone);
import { start } from "../start";
start("dayjs", createDayjsAdapter(dayjs), (id: string) => id);
