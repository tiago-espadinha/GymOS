import type { ReactNode } from "react";
import { formatDateFull } from "../../../utils/date";
import { sessionStats, sessionSummary } from "../../../utils/sessions";
import { WorkoutSession } from "../../../types";

const RECENT_COUNT = 6;

interface RecentSessionsProps {
  sessions: WorkoutSession[];
  onEdit: (session: WorkoutSession) => void;
  justSaved: { id: string; label: string } | null;
  /** Shown under the label while nothing has been saved. */
  empty: ReactNode;
}

export function RecentSessions({ sessions, onEdit, justSaved, empty }: RecentSessionsProps) {
  const recent = sessions.slice(0, RECENT_COUNT);
  return (
    <section aria-labelledby="logHomeRecentTitle" className={recent.length ? "logHomeRecent" : "logHomeRecent logHomeRecent--empty"}>
      <h2 id="logHomeRecentTitle" className="logHomeLabel">
        Recent sessions
      </h2>
      {recent.length === 0 ? (
        empty
      ) : (
        <ul className="logHomeList" role="list">
          {recent.map((s) => {
            const when = formatDateFull(s.date);
            const saved = s.id === justSaved?.id;
            return (
              <li key={s.id} className={saved ? "logHomeItem logHomeItem--saved" : "logHomeItem"}>
                <div className="logHomeItemText">
                  {saved && <span className="logHomeItemKicker">{justSaved.label}</span>}
                  <span className="logHomeItemHead">
                    <span className="logHomeItemTitle">{s.planName}</span>
                    <span className="logHomeItemMeta">{when}</span>
                  </span>
                  <span className="logHomeItemMeta logHomeItemSummary">{sessionSummary(sessionStats(s), s.notes)}</span>
                </div>
                <button type="button" className="logHomeEdit" onClick={() => onEdit(s)} aria-label={`Edit ${s.planName}, ${when}`}>
                  Edit
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default RecentSessions;
