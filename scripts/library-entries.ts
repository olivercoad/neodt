import type { Rolldown } from "tsdown";

/** Keep demo/test initialization out of the public JavaScript surface.
 * TypeScript's stripInternal removes the matching @internal declaration.
 */
export function libraryEntries(): Rolldown.Plugin {
  return {
    name: "library-entries",
    transform(code, id) {
      if (/\/src\/libraries\/[^/]+\.ts$/.test(id)) {
        return {
          code: code.replace("export const integration =", "       const integration ="),
          map: null,
        };
      }
    },
  };
}
