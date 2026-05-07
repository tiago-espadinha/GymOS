import { TimerControls, formatClock } from "../../hooks/useTimer";
import { TimerRing } from "./TimerRing";
import { PresetChips } from "./PresetChips";
import { ExerciseCategory } from "../../types";
import { TimerPhase, getAdjustStepSec } from "../../constants/timerPresets";
import "./timers.css";

interface PhaseTimerProps {
  label: string; // "HOLD", "REST", "RUN"...
  color: string;
  category: ExerciseCategory;
  phase: TimerPhase;
  controls: TimerControls;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onDone?: () => void;
  doneLabel?: string;
  size?: "sm" | "md";
}

export function PhaseTimer({
  label,
  color,
  category,
  phase,
  controls,
  expanded,
  onExpandedChange,
  onDone,
  doneLabel = "Mark done",
  size = "md",
}: PhaseTimerProps) {
  const {
    isRunning,
    isComplete,
    overtimeMs,
    progress,
    formattedElapsed,
    targetMs,
    start,
    pause,
    reset,
    setTargetSec,
    adjustTargetSec,
  } = controls;

  const stepSec = getAdjustStepSec(Math.round(targetMs / 1000));
  const ringSize = size === "sm" ? 76 : 116;
  const handleToggle = () => (isRunning ? pause() : start());

  if (!expanded) {
    return (
      <button
        type="button"
        className={`phaseTimerPill ${isRunning ? "isRunning" : ""} ${isComplete ? "isComplete" : ""}`}
        style={{ borderColor: isRunning || isComplete ? color : undefined, color: isRunning || isComplete ? color : undefined }}
        onClick={() => {
          onExpandedChange(true);
          if (!isRunning) start();
        }}
      >
        <span className="phaseTimerPillIcon">{isRunning ? "⏸" : "▶"}</span>
        <span className="phaseTimerPillLabel">{label}</span>
        <span className="phaseTimerPillTime">
          {isComplete ? `+${formatClock(overtimeMs)}` : formattedElapsed}
        </span>
        <span className="phaseTimerPillTarget">/ {formatClock(targetMs)}</span>
      </button>
    );
  }

  return (
    <div className="phaseTimerCard">
      <div className="phaseTimerHeader">
        <span className="phaseTimerHeaderLabel" style={{ color }}>
          {label}
        </span>
        <button
          type="button"
          className="phaseTimerCollapse"
          onClick={() => onExpandedChange(false)}
          title="Collapse"
        >
          ⌄
        </button>
      </div>

      <div className="phaseTimerBody">
        <TimerRing
          size={ringSize}
          progress={progress}
          color={color}
          overtime={isComplete}
        >
          <div className="timerRingTime" style={{ color: isComplete ? color : "var(--text)" }}>
            {isComplete ? `+${formatClock(overtimeMs)}` : formattedElapsed}
          </div>
          <div className="timerRingTarget">/ {formatClock(targetMs)}</div>
        </TimerRing>

        <div className="phaseTimerControlsCol">
          <div className="phaseTimerControls">
            <button
              type="button"
              className="phaseTimerBtn phaseTimerBtnPrimary"
              style={{ background: color, borderColor: color }}
              onClick={handleToggle}
            >
              {isRunning ? "⏸ Pause" : "▶ Start"}
            </button>
            <button type="button" className="phaseTimerBtn" onClick={reset}>
              ↺ Reset
            </button>
          </div>
          <div className="phaseTimerAdjust">
            <button type="button" className="phaseTimerAdjustBtn" onClick={() => adjustTargetSec(-stepSec)}>
              −{stepSec}s
            </button>
            <button type="button" className="phaseTimerAdjustBtn" onClick={() => adjustTargetSec(stepSec)}>
              +{stepSec}s
            </button>
          </div>
          {onDone && (
            <button
              type="button"
              className="phaseTimerBtn phaseTimerBtnDone"
              onClick={onDone}
            >
              ✓ {doneLabel}
            </button>
          )}
        </div>
      </div>

      <PresetChips
        category={category}
        phase={phase}
        targetSec={Math.round(targetMs / 1000)}
        onSelect={(sec) => setTargetSec(sec)}
        accentColor={color}
      />
    </div>
  );
}

export default PhaseTimer;
