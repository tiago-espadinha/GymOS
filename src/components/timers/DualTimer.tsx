import { useState } from "react";
import { useTimer, formatClock } from "../../hooks/useTimer";
import { PhaseTimer } from "./PhaseTimer";
import { ExerciseCategory } from "../../types";
import { restTimerId } from "../../utils/restTimers";
import "./timers.css";

interface DualTimerProps {
  baseId: string;
  category: ExerciseCategory;
  workLabel: string;
  restLabel?: string;
  initialWorkTargetSec: number;
  initialRestTargetSec: number;
  restEnabled: boolean;
  /** Called once the set (and, if enabled, its rest) is marked complete. */
  onCommit: (workSeconds: number, restSeconds: number | null) => void;
}

const REST_COLOR = "var(--color-fill-rest)";

export function DualTimer({
  baseId,
  category,
  workLabel,
  restLabel = "REST",
  initialWorkTargetSec,
  initialRestTargetSec,
  restEnabled,
  onCommit,
}: DualTimerProps) {
  const workControls = useTimer(`${baseId}-work`, initialWorkTargetSec);
  const restControls = useTimer(restTimerId(baseId), initialRestTargetSec);
  const workColor = "var(--color-fill-work)";

  const [activePhase, setActivePhase] = useState<"idle" | "work" | "rest">("idle");
  const [workDoneSec, setWorkDoneSec] = useState<number | null>(null);

  const finishWork = () => {
    const sec = Math.round(workControls.elapsedMs / 1000);
    workControls.pause();
    setWorkDoneSec(sec);
    if (restEnabled) {
      setActivePhase("rest");
      restControls.reset();
      restControls.start();
    } else {
      onCommit(sec, null);
      resetAll();
    }
  };

  const finishRest = () => {
    const restSec = Math.round(restControls.elapsedMs / 1000);
    onCommit(workDoneSec ?? 0, restSec);
    resetAll();
  };

  const resetAll = () => {
    workControls.reset();
    restControls.reset();
    setWorkDoneSec(null);
    setActivePhase("idle");
  };

  if (activePhase === "idle") {
    return (
      <button
        type="button"
        className="dualTimerIdle"
        onClick={() => {
          setActivePhase("work");
          if (!workControls.isRunning) workControls.start();
        }}
      >
        <span className="dualTimerIdleSeg" style={{ color: workColor }}>
          ▶ {workLabel} {formatClock(workControls.targetMs)}
        </span>
        {restEnabled && (
          <>
            <span className="dualTimerIdleArrow">→</span>
            <span className="dualTimerIdleSeg" style={{ color: REST_COLOR }}>
              {restLabel} {formatClock(restControls.targetMs)}
            </span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="dualTimer">
      {activePhase === "work" ? (
        <PhaseTimer
          label={workLabel}
          color={workColor}
          category={category}
          phase="work"
          controls={workControls}
          expanded
          onExpandedChange={(exp) => !exp && setActivePhase("idle")}
          onDone={finishWork}
          doneLabel={restEnabled ? "Start rest →" : "Mark set done"}
        />
      ) : (
        <>
          <div className="dualTimerDoneStrip" style={{ color: workColor }}>
            ✓ {workLabel} {formatClock((workDoneSec ?? 0) * 1000)}
          </div>
          <PhaseTimer
            label={restLabel}
            color={REST_COLOR}
            category={category}
            phase="rest"
            controls={restControls}
            expanded
            onExpandedChange={() => {}}
            onDone={finishRest}
            doneLabel="Mark set done"
          />
        </>
      )}
    </div>
  );
}

export default DualTimer;
