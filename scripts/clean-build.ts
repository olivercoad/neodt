import { rm } from "node:fs/promises";

// Clean once before the parallel target builds, including removed targets/entrypoints.
await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });
