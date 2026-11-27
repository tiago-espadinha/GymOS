import { useEffect } from "react";
import { formatRestClock, useTimer } from "../../../hooks/useTimer";
import { getAdjustStepSec } from "../../../constants/timerPresets";
import { useTimerPrefs } from "../../../utils/timerPrefs";
import { restTimerId } from "../../../utils/restTimers";
import { ExerciseCategory } from "../../../types";
import { TimerBlock, TimerButton } from "../TimerBlock";

interface RestBlockProps {
  setId: string;
  setNumber: number;
  /** Top right of the block; "Set n" by default. */
  meta?: string;
  category: ExerciseCategory;
  // True right after "Set done": start the rest. A rest restored from storage is left as it was.
  autoStart: boolean;
  // Called with the seconds the rest lasted, overtime included.
  onEnd: (restSeconds: number) => void;
}

export function RestBlock({ setId, setNumber, meta, category, autoStart, onEnd }: RestBlockProps) {
  // A rest already stored keeps its own target; the length from Settings is for new ones.
  const { restSec } = useTimerPrefs();
  const {
    isRunning, isComplete, elapsedMs, targetMs, overtimeMs, progress, formattedTarget,
    start, reset, adjustTargetSec,
  } = useTimer(restTimerId(setId), restSec[category]);
  // A target of 0 means the rest is already over (useTimer treats it as "no target").
  const over = isComplete || targetMs === 0;
  const step = getAdjustStepSec(Math.round(targetMs / 1000));

  useEffect(() => {
    if (autoStart && !isRunning && elapsedMs === 0) start();
    // Only on mount: a later pause or End rest must not restart the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const end = () => {
    const restSeconds = Math.round(elapsedMs / 1000);
    reset();
    onEnd(restSeconds);
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
      filling={isRunning && !over}
      status={over ? "Rest over" : "Rest started"}
    >
      {/* Past the target a shorter rest means nothing, so −step goes. */}
      {!over && <TimerButton onClick={() => adjustTargetSec(-step)}>−{step}s</TimerButton>}
      <TimerButton onClick={() => adjustTargetSec(step)}>+{step}s</TimerButton>
      {/* One label before and after the target, so the way out never moves or changes. */}
      <TimerButton onClick={end} wide>End rest</TimerButton>
    </TimerBlock>
  );
}

export default RestBlock;
