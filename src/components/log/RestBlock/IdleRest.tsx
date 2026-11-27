import { formatClock } from "../../../hooks/useTimer";
import { useTimerPrefs } from "../../../utils/timerPrefs";
import { ExerciseCategory } from "../../../types";

interface IdleRestProps {
  /** The set this rest will follow. */
  setNumber: number;
  category: ExerciseCategory;
}

// Wide only (TimerBlock.css): before Set done the timer's half of the screen
// shows the rest that will follow, so the layout holds still when it starts.
export function IdleRest({ setNumber, category }: IdleRestProps) {
  const { restSec } = useTimerPrefs();
  return (
    <section className="timerBlock timerBlock--rest timerBlock--idle" aria-label="Rest timer">
      <div className="timerBlockFace">
        <div className="timerBlockTop">
          <span>Rest</span>
          <span>After set {setNumber}</span>
        </div>
        <div className="timerBlockCountdown">{formatClock(restSec[category] * 1000)}</div>
        <div className="timerBlockTarget">Starts on Set done</div>
      </div>
    </section>
  );
}

export default IdleRest;
