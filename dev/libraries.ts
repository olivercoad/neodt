export { libraries, type LibraryId } from "../libraries.ts";
import type { LibraryId } from "../libraries.ts";
import { demoPath, currentFramework } from "./framework.ts";
export const libraryPath = (id: LibraryId) => demoPath(currentFramework().id, id);
