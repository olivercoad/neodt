import { createTemporalAdapter } from "../../src/adapters/temporal";
import { start, nativeUnavailable } from "../start";
if (typeof Temporal === "undefined") nativeUnavailable();
else start("native-temporal", createTemporalAdapter(globalThis.Temporal), (id: string) => id);
