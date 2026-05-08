import { useState } from "react";
import { useTimer } from "../../hooks/useTimer";
import { PhaseTimer } from "./PhaseTimer";
import { ExerciseCategory } from "../../types";
import { DEFAULT_PRESETS } from "../../constants/timerPresets";
import { restTimerId } from "../../utils/restTimers";
import "./timers.css";

interface RestTimerChipProps {
  baseId: string;
  category: ExerciseCategory;
}

const REST_COLOR = "var(--color-fill-rest)";

export function RestTimerChip({ baseId, category }: RestTimerChipProps) {
  const controls = useTimer(restTimerId(baseId), DEFAULT_PRESETS[category].rest[0]);
  // A rest restored from storage shows as running instead of a collapsed chip.
  const [expanded, setExpanded] = useState(controls.isRunning);

  if (!expanded) {
    return (
      <button type="button" className="restTimerTrigger" onClick={() => setExpanded(true)}>
        ⏱ Rest
      </button>
    );
  }

  return (
    <PhaseTimer
      label="REST"
      color={REST_COLOR}
      category={category}
      phase="rest"
      controls={controls}
      expanded={expanded}
      onExpandedChange={(exp) => {
        setExpanded(exp);
        if (!exp) controls.reset();
      }}
      onDone={() => {
        controls.reset();
        setExpanded(false);
      }}
      doneLabel="Done resting"
      size="sm"
    />
  );
}

export default RestTimerChip;
