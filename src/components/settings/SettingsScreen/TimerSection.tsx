import { useState } from "react";
import { SaveFailedAlert, Switch, TimeField } from "../../shared";
import { Section, SettingRow } from "./Section";
import { saveTimerPrefs, useTimerPrefs, type TimerPreferences } from "../../../utils/timerPrefs";
import { ExerciseCategory } from "../../../types";

const CATEGORIES: { key: ExerciseCategory; name: string }[] = [
  { key: "strength", name: "Strength" },
  { key: "calisthenics", name: "Calisthenics" },
  { key: "cardio", name: "Cardio" },
];

/** Rest lengths and what a timer does. A choice the browser refuses to store is undone, as for units. */
export function TimerSection() {
  const timers = useTimerPrefs();
  const [saveFailures, setSaveFailures] = useState(0);
  const choose = (next: Partial<TimerPreferences>) => {
    if (saveTimerPrefs({ ...timers, ...next })) setSaveFailures(0);
    else setSaveFailures((n) => n + 1);
  };
  // iPhone browsers have no vibration, so the switch would do nothing there.
  const canVibrate = "vibrate" in navigator;

  return (
    <Section title="Timers">
      <div>
        <p className="settingsHint">Rest after a set</p>
        {CATEGORIES.map(({ key, name }) => (
          <SettingRow key={key} label={name}>
            <TimeField
              className="settingsTime"
              label={`${name} rest`}
              seconds={timers.restSec[key]}
              onCommit={(seconds) => choose({ restSec: { ...timers.restSec, [key]: seconds } })}
            />
          </SettingRow>
        ))}
      </div>
      <Switch
        label="Rest after holds"
        description="A hold ends at its target and rests. Not cardio."
        checked={timers.restAfterHolds}
        onChange={(restAfterHolds) => choose({ restAfterHolds })}
      />
      <Switch
        label="Sound"
        description="Beep when a timer reaches its target"
        checked={timers.soundEnabled}
        onChange={(soundEnabled) => choose({ soundEnabled })}
      />
      {canVibrate && (
        <Switch
          label="Vibration"
          description="Vibrate when a timer reaches its target"
          checked={timers.vibrationEnabled}
          onChange={(vibrationEnabled) => choose({ vibrationEnabled })}
        />
      )}
      {saveFailures > 0 && (
        <SaveFailedAlert key={saveFailures}>
          The browser refused to store your timer choice, so it was left as it was. Free some space and try again.
        </SaveFailedAlert>
      )}
    </Section>
  );
}
