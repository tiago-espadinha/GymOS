import { useState } from "react";
import { ExerciseCategory } from "../../types";
import { DEFAULT_PRESETS, TimerPhase, formatPresetLabel } from "../../constants/timerPresets";
import { addCustomPreset, loadTimerPrefs, presetKey } from "../../utils/timerPrefs";
import "./PresetChips.css";

interface PresetChipsProps {
  category: ExerciseCategory;
  phase: TimerPhase;
  targetSec: number;
  onSelect: (seconds: number) => void;
  accentColor: string;
}

export function PresetChips({ category, phase, targetSec, onSelect, accentColor }: PresetChipsProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");
  // Re-read from storage on every render instead of caching in local state:
  // this widget gets freshly mounted a lot (every time a timer card
  // collapses/expands, or a dual timer swaps phase), and a cached copy would
  // go stale and make newly-added presets look like they "replaced" earlier
  // ones instead of accumulating. `refreshKey` just forces a re-render after
  // a write so the freshly-read list picks up the change.
  const [refreshKey, setRefreshKey] = useState(0);
  const customPresets = loadTimerPrefs().customPresets[presetKey(category, phase)] || [];

  const defaults = DEFAULT_PRESETS[category][phase];
  const allPresets = [...defaults, ...customPresets.filter((s) => !defaults.includes(s))];

  const handleCustomConfirm = () => {
    const seconds = parseInt(customInput, 10);
    if (!isNaN(seconds) && seconds > 0) {
      addCustomPreset(category, phase, seconds);
      setRefreshKey((k) => k + 1);
      onSelect(seconds);
      setCustomInput("");
      setShowCustomInput(false);
    }
  };

  return (
    <div className="presetChips" data-refresh={refreshKey}>
      {!showCustomInput ? (
        <div className="presetChipRow">
          {allPresets.map((sec) => {
            const isActive = sec === targetSec;
            return (
              <button
                key={sec}
                type="button"
                className={`presetChip ${isActive ? "active" : ""}`}
                style={isActive ? { background: accentColor, borderColor: accentColor } : undefined}
                onClick={() => onSelect(sec)}
              >
                {formatPresetLabel(sec)}
              </button>
            );
          })}
          <button
            type="button"
            className="presetChip presetChipAdd"
            onClick={() => setShowCustomInput(true)}
            title="Add custom preset"
          >
            +
          </button>
        </div>
      ) : (
        <div className="presetCustomRow">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            autoFocus
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Seconds"
            className="presetCustomInput"
            onKeyDown={(e) => e.key === "Enter" && handleCustomConfirm()}
          />
          <button type="button" className="presetCustomConfirm" onClick={handleCustomConfirm}>
            ✓
          </button>
          <button
            type="button"
            className="presetCustomCancel"
            onClick={() => {
              setShowCustomInput(false);
              setCustomInput("");
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default PresetChips;
