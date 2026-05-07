import { useState } from "react";
import { NumericInput } from "../../shared";
import { DualTimer } from "../../timers";
import { Set, ExerciseCategory } from "../../../types";
import { DEFAULT_PRESETS } from "../../../constants/timerPresets";
import { formatClock } from "../../../hooks/useTimer";
import "./TimedSetRow.css";

interface TimedSetRowProps {
  set: Set;
  index: number;
  onChange: (set: Set) => void;
  onRemove: () => void;
  category: ExerciseCategory;
  trackDistance?: boolean;
  distanceUnit?: "km" | "mi";
}

const WORK_LABELS: Record<ExerciseCategory, string> = {
  strength: "HOLD",
  calisthenics: "HOLD",
  cardio: "CARDIO",
};

// Isometric holds and loaded carries naturally chain into a rest before the
// next set; steady-state cardio usually doesn't, so default accordingly. The
// checkbox always lets the person override it either way.
const DEFAULT_REST_ENABLED: Record<ExerciseCategory, boolean> = {
  strength: true,
  calisthenics: true,
  cardio: false,
};

export default function TimedSetRow({
  set,
  index,
  onChange,
  onRemove,
  category,
  trackDistance = false,
  distanceUnit = "km",
}: TimedSetRowProps) {
  const [restEnabled, setRestEnabled] = useState(DEFAULT_REST_ENABLED[category]);
  const presets = DEFAULT_PRESETS[category];

  const handleCommit = (workSeconds: number, restSeconds: number | null) => {
    onChange({
      ...set,
      duration: String(workSeconds),
      restTaken: restSeconds !== null ? String(restSeconds) : set.restTaken,
      completed: true,
    });
  };

  return (
    <div className="timedSetRow">
      <span className="timedSetRowIndex">{index + 1}</span>

      <div className="timedSetRowMain">
        <DualTimer
          baseId={set.id}
          category={category}
          workLabel={WORK_LABELS[category]}
          initialWorkTargetSec={Number(set.duration) || presets.work[0]}
          initialRestTargetSec={presets.rest[0]}
          restEnabled={restEnabled}
          onCommit={handleCommit}
        />

        <div className="timedSetRowMeta">
          <label className="timedSetRowRestToggle">
            <input
              type="checkbox"
              checked={restEnabled}
              onChange={(e) => setRestEnabled(e.target.checked)}
            />
            Chain rest timer
          </label>

          {set.completed && (
            <span className="timedSetRowLogged">
              ✓ {formatClock((Number(set.duration) || 0) * 1000)}
              {set.restTaken ? ` · rest ${formatClock(Number(set.restTaken) * 1000)}` : ""}
            </span>
          )}

          {trackDistance && (
            <div className="timedSetRowDistance">
              <NumericInput
                value={set.distance || ""}
                onChange={(v) => onChange({ ...set, distance: v })}
                placeholder="0"
                step={0.1}
                style={{ width: "90px" }}
              />
              <span className="timedSetRowDistanceUnit">{distanceUnit}</span>
            </div>
          )}
        </div>
      </div>

      <button onClick={onRemove} className="timedSetRowRemove">
        ×
      </button>
    </div>
  );
}
