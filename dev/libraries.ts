export { libraries, type LibraryId } from "../libraries";
import type { LibraryId } from "../libraries";
import { demoPath, currentFramework } from "./framework";
export const libraryPath = (id: LibraryId) => demoPath(currentFramework().id, id);
