import { useEffect } from "react";
import { formatRestClock, useTimer } from "../../../hooks/useTimer";
import { DEFAULT_PRESETS, getAdjustStepSec } from "../../../constants/timerPresets";
import { restTimerId } from "../../../utils/restTimers";
import { ExerciseCategory } from "../../../types";
import { TimerBlock, TimerButton } from "../TimerBlock";

// A rest after a set of reps steps by 15s; one chained after a hold steps by its
// target, like the hold (5s under a minute).
const REPS_STEP_SEC = 15;

interface RestBlockProps {
  setId: string;
  setNumber: number;
  /** Top right of the block; "Set n" by default. */
  meta?: string;
  /** Chained after a timed set: the step follows the target. */
  timed?: boolean;
  category: ExerciseCategory;
  // True right after "Set done": start the rest. A rest restored from storage is left as it was.
  autoStart: boolean;
  // Called with the seconds the rest lasted, overtime included.
  onSkip: (restSeconds: number) => void;
}

export function RestBlock({ setId, setNumber, meta, timed = false, category, autoStart, onSkip }: RestBlockProps) {
  const {
    isRunning, isComplete, elapsedMs, targetMs, overtimeMs, progress, formattedTarget,
    start, reset, adjustTargetSec,
  } = useTimer(restTimerId(setId), DEFAULT_PRESETS[category].rest[0]);
  // A target of 0 means the rest is already over (useTimer treats it as "no target").
  const over = isComplete || targetMs === 0;
  const step = timed ? getAdjustStepSec(Math.round(targetMs / 1000)) : REPS_STEP_SEC;

  useEffect(() => {
    if (autoStart && !isRunning && elapsedMs === 0) start();
    // Only on mount: a later pause or skip must not restart the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    const restSeconds = Math.round(elapsedMs / 1000);
    reset();
    onSkip(restSeconds);
  };

  return (
    <TimerBlock
      tone="rest"
      label={over ? "Rest over" : "Rest"}
      setNumber={setNumber}
      meta={meta}
      countdown={formatRestClock(Math.max(0, targetMs - elapsedMs), overtimeMs)}
      caption={over ? `${formattedTarget} done` : `Target ${formattedTarget}`}
      fillPct={over ? 100 : Math.round(progress * 1000) / 10}
      status={over ? "Rest over" : "Rest started"}
    >
      {/* Past the target a shorter rest means nothing, so −step goes. */}
      {!over && <TimerButton onClick={() => adjustTargetSec(-step)}>−{step}s</TimerButton>}
      <TimerButton onClick={() => adjustTargetSec(step)}>+{step}s</TimerButton>
      <TimerButton onClick={skip} wide={over}>{over ? "Done resting" : "Skip"}</TimerButton>
    </TimerBlock>
  );
}

export default RestBlock;
