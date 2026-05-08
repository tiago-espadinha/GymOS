import { useEffect, useState, type ReactNode } from "react";
import { formatRestClock, useTimer } from "../../../hooks/useTimer";
import { DEFAULT_PRESETS } from "../../../constants/timerPresets";
import { restTimerId } from "../../../utils/restTimers";
import { ExerciseCategory } from "../../../types";
import "./RestBlock.css";

const STEP_SEC = 15;

interface RestBlockProps {
  setId: string;
  setNumber: number;
  category: ExerciseCategory;
  // True right after "Set done": start the rest. A rest restored from storage is left as it was.
  autoStart: boolean;
  onSkip: () => void;
}

// The block fills from the bottom as the rest elapses. The countdown is drawn
// twice, white on the empty part and black on the filled part, and the fill clips
// the black copy, so the numeral stays readable without any blend mode.
export function RestBlock({ setId, setNumber, category, autoStart, onSkip }: RestBlockProps) {
  const {
    isRunning, isComplete, elapsedMs, targetMs, overtimeMs, progress, formattedTarget,
    start, reset, adjustTargetSec,
  } = useTimer(restTimerId(setId), DEFAULT_PRESETS[category].rest[0]);
  // A target of 0 means the rest is already over (useTimer treats it as "no target").
  const over = isComplete || targetMs === 0;

  // A live region only announces changes, so it is filled once the block has mounted.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setArmed(true), 100);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (autoStart && !isRunning && elapsedMs === 0) start();
    // Only on mount: a later pause or skip must not restart the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countdown = formatRestClock(Math.max(0, targetMs - elapsedMs), overtimeMs);

  const face = (
    <>
      <div className="restBlockTop">
        <span className="restBlockLabel">Rest</span>
        <span className="restBlockContext">Set {setNumber}</span>
      </div>
      <div className="restBlockCountdown">{countdown}</div>
      <div className="restBlockTarget">Target {formattedTarget}</div>
    </>
  );

  const skip = () => {
    reset();
    onSkip();
  };

  return (
    <section className="restBlock" aria-label="Rest timer">
      <div className="restBlockFace" role="timer" aria-label={`Rest, ${countdown}`}>
        {face}
      </div>
      <div className="restBlockFill" style={{ height: `${over ? 100 : Math.round(progress * 1000) / 10}%` }} aria-hidden="true">
        <div className="restBlockFace restBlockFace--onFill">{face}</div>
      </div>
      <div className="restBlockControls">
        <RestButton onClick={() => adjustTargetSec(-STEP_SEC)}>−{STEP_SEC}s</RestButton>
        <RestButton onClick={() => adjustTargetSec(STEP_SEC)}>+{STEP_SEC}s</RestButton>
        <RestButton onClick={skip}>Skip</RestButton>
      </div>
      <span role="status" className="restBlockAnnounce">
        {/* Phase changes only, never every second. */}
        {armed ? (over ? "Rest over" : "Rest started") : ""}
      </span>
    </section>
  );
}

function RestButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="restBlockButton" onClick={onClick}>
      {children}
    </button>
  );
}

export default RestBlock;
