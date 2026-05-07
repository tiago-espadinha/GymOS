import { useCallback, useEffect, useState } from "react";
import {
  ActiveSession,
  loadActiveSession,
  saveActiveSession,
} from "../utils/activeSession";

export interface ActiveSessionControls {
  session: ActiveSession | null;
  begin: (session: ActiveSession) => void;
  update: (patch: Partial<ActiveSession>) => void;
  end: () => void;
}

export function useActiveSession(): ActiveSessionControls {
  const [session, setSession] = useState<ActiveSession | null>(loadActiveSession);

  useEffect(() => {
    saveActiveSession(session);
  }, [session]);

  const begin = useCallback((next: ActiveSession) => setSession(next), []);
  const update = useCallback(
    (patch: Partial<ActiveSession>) =>
      setSession((current) => (current ? { ...current, ...patch } : current)),
    [],
  );
  const end = useCallback(() => setSession(null), []);

  return { session, begin, update, end };
}
