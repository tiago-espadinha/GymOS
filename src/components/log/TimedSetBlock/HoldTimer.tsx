import { formatClock, formatRestClock, type TimerControls } from "../../../hooks/useTimer";
import { SecondaryButton } from "../../shared";
import { TimerBlock } from "../TimerBlock";
import { TargetRow } from "../TimerBlock/TargetRow";
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

// The white block of a hold. Ready has no buttons of its own: the hold starts from the main button.
export function HoldTimer({ timer, name, setNumber, setTotal, onDiscard }: HoldTimerProps) {
  const { isComplete, elapsedMs, targetMs, overtimeMs, progress, formattedTarget, start, pause, adjustTargetSec, setTargetSec } = timer;
  const phase = holdPhase(timer);

  return (
    <TimerBlock
      tone="hold"
      label={name + SUFFIX[phase]}
      setNumber={setNumber}
      meta={`Set ${setNumber} of ${setTotal}`}
      // A hold shows the time held, the number Stop and log saves; ready shows the target.
      countdown={phase === "ready" ? formattedTarget : isComplete ? formatRestClock(0, overtimeMs) : formatClock(elapsedMs)}
      // While it runs, the target row says what the target is.
      caption={phase === "ready" || phase === "running" ? "" : isComplete ? `${formattedTarget} reached` : `of ${formattedTarget}`}
      fillPct={isComplete ? 100 : Math.round(progress * 1000) / 10}
      filling={phase === "running"}
      status={phase === "ready" ? "" : phase === "over" ? "Target reached" : `${name} ${phase}`}
      actions={
        phase === "paused" ? (
          <>
            <SecondaryButton onClick={onDiscard}>Stop</SecondaryButton>
            <SecondaryButton onClick={start}>Resume</SecondaryButton>
          </>
        ) : (
          phase !== "ready" && <SecondaryButton onClick={pause}>Pause</SecondaryButton>
        )
      }
    >
      {phase === "running" && (
        <TargetRow targetMs={targetMs} keepAStep onAdjust={adjustTargetSec} onType={setTargetSec} />
      )}
    </TimerBlock>
  );
}
