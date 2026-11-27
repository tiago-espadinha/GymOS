import { useId, type ReactNode } from "react";
import { Icon } from "../Icon";
import { Sheet } from "../Sheet";
import { moveListboxFocus } from "../Select/listbox";
import "./ListboxSheet.css";

export interface ListboxOption {
  key: string;
  name: string;
  /** The muted line under the name, when there is something to add. */
  meta?: string;
}

interface ListboxSheetProps {
  title: string;
  options: ListboxOption[];
  selectedKey: string;
  onPick: (key: string) => void;
  onClose: () => void;
  /** Notes under the list. */
  children?: ReactNode;
}

/** A full-screen listbox: one Tab stop on the chosen option, arrows move, Enter or Space picks. */
export function ListboxSheet({ title, options, selectedKey, onPick, onClose, children }: ListboxSheetProps) {
  const titleId = useId();
  return (
    <Sheet full labelledBy={titleId} onClose={onClose}>
      <header className="planPicker__head">
        <h2 id={titleId} className="sheet__title sheet__title--lg">
          {title}
        </h2>
        <button type="button" className="sheet__cancel" onClick={onClose}>
          Close
        </button>
      </header>
      <div role="listbox" aria-labelledby={titleId} className="planPicker__list" onKeyDown={moveListboxFocus}>
        {options.map((option) => {
          const selected = option.key === selectedKey;
          return (
            <button
              key={option.key}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              data-autofocus={selected || undefined}
              className="planPicker__option"
              onClick={() => onPick(option.key)}
            >
              <span className="planPicker__text">
                <span className="planPicker__name">{option.name}</span>
                {option.meta && <span className="planPicker__meta">{option.meta}</span>}
              </span>
              {selected && <Icon name="check" />}
            </button>
          );
        })}
      </div>
      {children}
    </Sheet>
  );
}

export default ListboxSheet;
