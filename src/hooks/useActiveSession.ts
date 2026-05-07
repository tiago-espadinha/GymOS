import { useCallback, useEffect, useState } from "react";
import {
  ActiveSession,
  loadActiveSession,
  saveActiveSession,
} from "../utils/activeSession";
import { ExerciseLog } from "../types";

export function useActiveSession() {
  const [session, setSession] = useState<ActiveSession | null>(loadActiveSession);

  useEffect(() => {
    saveActiveSession(session);
  }, [session]);

  const update = useCallback(
    (patch: Partial<ActiveSession>) =>
      setSession((current) => (current ? { ...current, ...patch } : current)),
    [],
  );

  // Replaces one exercise from the latest state, so quick successive changes
  // to different exercises never overwrite each other.
  const updateExercise = useCallback(
    (updated: ExerciseLog) =>
      setSession((current) =>
        current
          ? {
              ...current,
              exercises: current.exercises.map((e) => (e.id === updated.id ? updated : e)),
            }
          : current,
      ),
    [],
  );

  return {
    session,
    begin: setSession,
    update,
    updateExercise,
    end: () => setSession(null),
  };
}
