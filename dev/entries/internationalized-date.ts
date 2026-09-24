import { fromAbsolute } from "@internationalized/date";

import { createInternationalizedDateAdapter } from "../../src/adapters/internationalized-date";
import { start } from "../start";
start(
  "internationalized-date",
  createInternationalizedDateAdapter(fromAbsolute),
  (id: string) => id,
);
