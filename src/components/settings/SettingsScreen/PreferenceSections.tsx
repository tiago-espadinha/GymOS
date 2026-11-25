import { useId, useState, type ReactNode } from "react";
import { SaveFailedAlert, SegmentedControl } from "../../shared";
import { AccentPicker } from "./AccentPicker";
import { saveUnitPrefs, useUnitPrefs, type UnitPreferences } from "../../../utils/unitPrefs";

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="settingsSection" aria-labelledby={id}>
      <h2 id={id} className="dataKicker">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settingsRow">
      <span className="settingsRowLabel">{label}</span>
      {children}
    </div>
  );
}

/** Language, Units and Appearance. A unit choice the browser refuses to store is undone, so the screen shows what is stored. */
export function PreferenceSections() {
  const units = useUnitPrefs();
  const [saveFailures, setSaveFailures] = useState(0);

  const choose = (next: UnitPreferences) => {
    if (saveUnitPrefs(next)) {
      setSaveFailures(0);
    } else {
      setSaveFailures((n) => n + 1);
    }
  };

  return (
    <>
      <Section title="Language">
        <SettingRow label="App language">
          <span className="settingsRowValue">English</span>
        </SettingRow>
      </Section>

      <Section title="Units">
        <div>
          <SettingRow label="Weight">
            <SegmentedControl
              label="Weight unit"
              tone="lime"
              options={[{ value: "kg", label: "kg" }, { value: "lbs", label: "lb" }]}
              value={units.weight}
              onChange={(weight) => choose({ ...units, weight })}
            />
          </SettingRow>
          <SettingRow label="Distance">
            <SegmentedControl
              label="Distance unit"
              tone="lime"
              options={[{ value: "km", label: "km" }, { value: "mi", label: "mi" }]}
              value={units.distance}
              onChange={(distance) => choose({ ...units, distance })}
            />
          </SettingRow>
        </div>
        {saveFailures > 0 && (
          <SaveFailedAlert key={saveFailures}>
            The browser refused to store your unit choice, so it was left as it was. Free some space and try again.
          </SaveFailedAlert>
        )}
      </Section>

      <Section title="Appearance">
        <AccentPicker />
      </Section>
    </>
  );
}
