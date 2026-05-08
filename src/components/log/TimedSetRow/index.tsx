import { Set } from "../../../types";
import { formatClock } from "../../../hooks/useTimer";
import "./TimedSetRow.css";

interface TimedSetRowProps {
  set: Set;
  index: number;
  onRemove: () => void;
  distanceUnit?: "km" | "mi";
}

// A timed set that has been logged: its hold, the rest taken and any distance.
export default function TimedSetRow({ set, index, onRemove, distanceUnit = "km" }: TimedSetRowProps) {
  const parts = [formatClock((Number(set.duration) || 0) * 1000)];
  if (set.restTaken) parts.push(`rest ${formatClock(Number(set.restTaken) * 1000)}`);
  if (set.distance) parts.push(`${set.distance} ${distanceUnit}`);
  return (
    <div className="timedSetRow">
      <span className="timedSetRowIndex">{index + 1}</span>
      <span className="timedSetRowLogged">{parts.join(" · ")}</span>
      <button type="button" onClick={onRemove} className="timedSetRowRemove" aria-label={`Remove set ${index + 1}`}>
        ×
      </button>
    </div>
  );
}
