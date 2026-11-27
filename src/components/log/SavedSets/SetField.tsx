import { useState } from "react";

export interface FieldFormat {
  inputMode: "decimal" | "numeric";
  placeholder: string;
  /** The stored value as the field shows it. */
  show: (stored: string) => string;
  /** What the field keeps of what was typed. */
  type: (typed: string) => string;
  /** The field's text as the stored value. */
  store: (text: string) => string;
  /** Applied on leaving the field. */
  settle?: (text: string) => string;
}

interface SetFieldProps {
  label: string;
  value: string | undefined;
  format: FieldFormat;
  onChange: (value: string | undefined) => void;
}

// One typeable value of a saved set. The text lives here so "60." survives typing,
// and text left as it was first shown keeps the stored value at full precision.
export function SetField({ label, value, format, onChange }: SetFieldProps) {
  const [first] = useState(value);
  const [text, setText] = useState(() => format.show(value ?? ""));
  return (
    <input
      className="savedSetsField"
      aria-label={label}
      inputMode={format.inputMode}
      placeholder={format.placeholder}
      value={text}
      onFocus={(e) => e.target.select()}
      // Every tap selects the whole value, so typing replaces it rather than landing mid-value:
      // click covers a field already focused, and Safari would undo the first selection on mouseup.
      onClick={(e) => e.currentTarget.select()}
      onMouseUp={(e) => e.preventDefault()}
      onChange={(e) => {
        const next = format.type(e.target.value);
        setText(next);
        onChange(next === format.show(first ?? "") ? first : format.store(next));
      }}
      onBlur={() => format.settle && setText(format.settle)}
    />
  );
}

export default SetField;
