import "@builder.io/mitosis/jsx-runtime";
// Mitosis accepts DOM property casing but its JSX declarations omit these React-compatible names.
declare module "@builder.io/mitosis/jsx-runtime" {
  namespace JSX {
    interface SvgSVGAttributes<T> {
      part?: string;
    }
    interface HTMLAttributes<T> {
      spellCheck?: boolean;
      suppressContentEditableWarning?: boolean;
    }
  }
}
