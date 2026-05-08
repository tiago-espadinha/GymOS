import { useEffect } from "react";
import { formatRestClock, useTimer } from "../../../hooks/useTimer";
import { DEFAULT_PRESETS } from "../../../constants/timerPresets";
import { restTimerId } from "../../../utils/restTimers";
import { ExerciseCategory } from "../../../types";
import { TimerBlock, TimerButton } from "../TimerBlock";

const STEP_SEC = 15;

interface RestBlockProps {
  setId: string;
  setNumber: number;
  category: ExerciseCategory;
  // True right after "Set done": start the rest. A rest restored from storage is left as it was.
  autoStart: boolean;
  // Called with the seconds the rest lasted, overtime included.
  onSkip: (restSeconds: number) => void;
}

export function RestBlock({ setId, setNumber, category, autoStart, onSkip }: RestBlockProps) {
  const {
    isRunning, isComplete, elapsedMs, targetMs, overtimeMs, progress, formattedTarget,
    start, reset, adjustTargetSec,
  } = useTimer(restTimerId(setId), DEFAULT_PRESETS[category].rest[0]);
  // A target of 0 means the rest is already over (useTimer treats it as "no target").
  const over = isComplete || targetMs === 0;

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
      label="Rest"
      setNumber={setNumber}
      countdown={formatRestClock(Math.max(0, targetMs - elapsedMs), overtimeMs)}
      formattedTarget={formattedTarget}
      fillPct={over ? 100 : Math.round(progress * 1000) / 10}
      status={over ? "Rest over" : "Rest started"}
    >
      <TimerButton onClick={() => adjustTargetSec(-STEP_SEC)}>−{STEP_SEC}s</TimerButton>
      <TimerButton onClick={() => adjustTargetSec(STEP_SEC)}>+{STEP_SEC}s</TimerButton>
      <TimerButton onClick={skip}>Skip</TimerButton>
    </TimerBlock>
  );
}

export default RestBlock;
