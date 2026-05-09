import { formatRestClock, type TimerControls } from "../../../hooks/useTimer";
import { getAdjustStepSec } from "../../../constants/timerPresets";
import { TimerBlock, TimerButton } from "../TimerBlock";
import { HoldPhase, holdPhase } from "./holdPhase";

const SUFFIX: Record<HoldPhase, string> = { ready: " · ready", running: "", paused: " · paused", over: " · past target" };

interface HoldTimerProps {
  timer: TimerControls;
  /** "Hold", or "Effort" for cardio. */
  name: string;
  setNumber: number;
  setTotal: number;
  /** Stop on a paused hold: drop it and go back to ready. */
  onDiscard: () => void;
}

// The white block of a hold. Ready has no buttons: the hold starts from the button below.
export function HoldTimer({ timer, name, setNumber, setTotal, onDiscard }: HoldTimerProps) {
  const { isComplete, elapsedMs, targetMs, overtimeMs, progress, formattedTarget, start, pause, adjustTargetSec } = timer;
  const phase = holdPhase(timer);
  const step = getAdjustStepSec(Math.round(targetMs / 1000));

  return (
    <TimerBlock
      tone="hold"
      label={name + SUFFIX[phase]}
      setNumber={setNumber}
      meta={`Set ${setNumber} of ${setTotal}`}
      countdown={formatRestClock(Math.max(0, targetMs - elapsedMs), overtimeMs)}
      caption={phase === "ready" ? "" : isComplete ? `${formattedTarget} reached` : `of ${formattedTarget}`}
      fillPct={isComplete ? 100 : Math.round(progress * 1000) / 10}
      status={phase === "ready" ? "" : phase === "over" ? "Target reached" : `${name} ${phase}`}
    >
      {phase === "running" && (
        <>
          <TimerButton onClick={() => adjustTargetSec(-step)} disabled={targetMs / 1000 <= step}>−{step}s</TimerButton>
          <TimerButton onClick={() => adjustTargetSec(step)}>+{step}s</TimerButton>
        </>
      )}
      {(phase === "running" || phase === "over") && <TimerButton onClick={pause}>Pause</TimerButton>}
      {phase === "paused" && (
        <>
          <TimerButton onClick={onDiscard}>Stop</TimerButton>
          <TimerButton onClick={start}>Resume</TimerButton>
        </>
      )}
    </TimerBlock>
  );
}
