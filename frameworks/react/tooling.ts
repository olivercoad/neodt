import type { FrameworkTooling } from "../tooling.ts";

// Explicit JSX pragmas use Vite's built-in transform.
export default {
  build: { banner: { js: '"use client";' } },
} satisfies FrameworkTooling;
