import { useState } from "react";
import { Icon, SaveFailedAlert } from "../../shared";
import { ACCENTS, saveAccent, useAccent, type AccentId } from "../../../utils/accentPrefs";

/** A row of accent swatches. A choice the browser refuses to store is undone, so the screen shows what is stored. */
export function AccentPicker() {
  const accent = useAccent();
  const [saveFailures, setSaveFailures] = useState(0);
  const current = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];

  const choose = (next: AccentId) => setSaveFailures((n) => (saveAccent(next) ? 0 : n + 1));

  return (
    <>
      <div className="settingsRow">
        <span className="settingsRowLabel">Accent color</span>
        <span className="accentName">{current.name}</span>
      </div>
      <div role="group" aria-label="Accent colour" className="accentSwatches">
        {ACCENTS.map(({ id, name }) => (
          <button
            key={id}
            type="button"
            className={`accentSwatch accentSwatch--${id}`}
            aria-label={name}
            aria-pressed={id === accent}
            onClick={() => choose(id)}
          >
            {id === accent && <Icon name="check" />}
          </button>
        ))}
      </div>
      {saveFailures > 0 && (
        <SaveFailedAlert key={saveFailures}>
          The browser refused to store your accent, so it was left as it was. Free some space and try again.
        </SaveFailedAlert>
      )}
    </>
  );
}
