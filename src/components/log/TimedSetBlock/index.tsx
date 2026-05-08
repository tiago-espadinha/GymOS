import { useEffect, useRef } from "react";
import { formatRestClock, useTimer } from "../../../hooks/useTimer";
import { getAdjustStepSec } from "../../../constants/timerPresets";
import { holdTimerId } from "../../../utils/restTimers";
import { ExerciseCategory } from "../../../types";
import { TimerBlock, TimerButton } from "../TimerBlock";

interface TimedSetBlockProps {
  setId: string;
  setNumber: number;
  category: ExerciseCategory;
  initialTargetSec: number;
  // When on, reaching the target ends the hold; when off the hold runs on as overtime.
  chainRest: boolean;
  // The hold is over: the seconds actually held.
  onHoldDone: (seconds: number) => void;
}

// Idle shows the target with Start; running and paused show Pause or Resume, a
// longer target and Finish.
export function TimedSetBlock({ setId, setNumber, category, initialTargetSec, chainRest, onHoldDone }: TimedSetBlockProps) {
  const {
    isRunning, isComplete, elapsedMs, targetMs, overtimeMs, progress, formattedTarget,
    start, pause, reset, adjustTargetSec,
  } = useTimer(holdTimerId(setId), initialTargetSec);

  const started = isRunning || elapsedMs > 0;
  const heldSec = Math.round(elapsedMs / 1000);
  const step = getAdjustStepSec(Math.round(targetMs / 1000));

  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    reset();
    onHoldDone(heldSec);
  };

  // Reaching the target ends the hold when a rest is chained after it.
  useEffect(() => {
    if (chainRest && isComplete) finish();
    // finish reads the current render's values, which these dependencies track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainRest, isComplete]);

  const status = isComplete ? "Target reached" : started ? (isRunning ? "Hold running" : "Hold paused") : "";

  return (
    <TimerBlock
      tone="hold"
      label={category === "cardio" ? "Cardio" : "Hold"}
      setNumber={setNumber}
      countdown={formatRestClock(Math.max(0, targetMs - elapsedMs), overtimeMs)}
      formattedTarget={formattedTarget}
      fillPct={isComplete ? 100 : Math.round(progress * 1000) / 10}
      status={status}
    >
      {started ? (
        <>
          <TimerButton onClick={isRunning ? pause : start}>{isRunning ? "Pause" : "Resume"}</TimerButton>
          <TimerButton onClick={() => adjustTargetSec(step)}>+{step}s</TimerButton>
          <TimerButton onClick={finish} disabled={heldSec < 1}>Finish</TimerButton>
        </>
      ) : (
        <>
          <TimerButton onClick={() => adjustTargetSec(-step)} disabled={targetMs / 1000 <= step}>−{step}s</TimerButton>
          <TimerButton onClick={() => adjustTargetSec(step)}>+{step}s</TimerButton>
          <TimerButton onClick={start}>Start</TimerButton>
        </>
      )}
    </TimerBlock>
  );
}

export default TimedSetBlock;
