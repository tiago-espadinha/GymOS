import { useEffect, useState } from "react";
import { formatClock } from "../../../hooks/useTimer";
import { ExerciseLog } from "../../../types";
import { findRunningRest } from "../../../utils/restTimers";
import "./RestStrip.css";

interface RestStripProps {
  exercises: ExerciseLog[];
  onOpen: (exerciseId: string) => void;
}

// Read-only: the rest itself is run by the exercise's own timer, this only
// mirrors it so it stays visible from the list.
export function RestStrip({ exercises, onOpen }: RestStripProps) {
  const [rest, setRest] = useState(() => findRunningRest(exercises, Date.now()));

  useEffect(() => {
    const id = setInterval(() => setRest(findRunningRest(exercises, Date.now())), 500);
    return () => clearInterval(id);
  }, [exercises]);

  if (!rest) return null;
  return (
    <button type="button" className="restStrip" onClick={() => onOpen(rest.exerciseId)}>
      <span className="restStripLabel">Rest</span>
      <span className="restStripTime">{formatClock(rest.remainingMs)}</span>
      <span className="restStripName">{rest.exerciseName}</span>
    </button>
  );
}

export default RestStrip;
