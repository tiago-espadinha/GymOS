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
    // The empty strip below stands where End rest will be, so nothing moves when the rest starts.
    <div className="timerUnit timerUnit--actions timerUnit--idle">
      <section className="timerBlock timerBlock--rest" aria-label="Rest timer">
        <div className="timerBlockFace">
          <div className="timerBlockTop">
            <span>Rest</span>
            <span>After set {setNumber}</span>
          </div>
          <div className="timerBlockCountdown">{formatClock(restSec[category] * 1000)}</div>
          <div className="timerBlockTarget">Starts on Set done</div>
        </div>
      </section>
    </div>
  );
}

export default IdleRest;
