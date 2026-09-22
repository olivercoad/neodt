import Prism from "prismjs";
import "prismjs/components/prism-css-extras";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";

// The default build supplies CSS and the markup/JavaScript dependencies of TSX.
// Import only the extra grammars we use; no language autoloader or editor runtime.
Prism.manual = true;

export type CodeLanguage = "css" | "tsx";

export function highlight(code: string, language: CodeLanguage) {
  // Prism escapes source text before producing token markup, including reader-edited CSS.
  return Prism.highlight(code, Prism.languages[language]!, language);
}
