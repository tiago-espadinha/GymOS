import { useState } from "react";
import { useTimer } from "../../hooks/useTimer";
import { PhaseTimer } from "./PhaseTimer";
import { ExerciseCategory } from "../../types";
import { DEFAULT_PRESETS } from "../../constants/timerPresets";
import "./timers.css";

interface RestTimerChipProps {
  baseId: string;
  category: ExerciseCategory;
}

const REST_COLOR = "#fbbf24";

export function RestTimerChip({ baseId, category }: RestTimerChipProps) {
  const [expanded, setExpanded] = useState(false);
  const controls = useTimer(`${baseId}-rest`, DEFAULT_PRESETS[category].rest[0]);

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
