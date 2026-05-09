import type { ReactNode } from "react";
import { formatDateFull } from "../../../utils/date";
import { sessionStats, sessionSummary } from "../../../utils/sessions";
import { WorkoutSession } from "../../../types";

const RECENT_COUNT = 6;

interface RecentSessionsProps {
  sessions: WorkoutSession[];
  onEdit: (session: WorkoutSession) => void;
  onDelete: (id: string) => void;
  /** Shown under the label while nothing has been saved. */
  empty: ReactNode;
}

export function RecentSessions({ sessions, onEdit, onDelete, empty }: RecentSessionsProps) {
  const recent = sessions.slice(0, RECENT_COUNT);
  if (recent.length === 0) {
    return (
      <section aria-labelledby="logHomeRecentTitle" className="logHomeRecent logHomeRecent--empty">
        <h2 id="logHomeRecentTitle" className="logHomeLabel">
          Recent sessions
        </h2>
        {empty}
      </section>
    );
  }
  return (
    <section aria-labelledby="logHomeRecentTitle" className="logHomeRecent">
      <h2 id="logHomeRecentTitle" className="logHomeLabel">
        Recent sessions
      </h2>
      <ul className="logHomeList" role="list">
        {recent.map((s) => {
          const when = formatDateFull(s.date);
          return (
            <li key={s.id} className="logHomeItem">
              <div className="logHomeItemText">
                <span className="logHomeItemHead">
                  <span className="logHomeItemTitle">{s.planName}</span>
                  <span className="logHomeItemMeta">{when}</span>
                </span>
                <span className="logHomeItemMeta logHomeItemSummary">{sessionSummary(sessionStats(s), s.notes)}</span>
              </div>
              <button type="button" className="logHomeEdit" onClick={() => onEdit(s)} aria-label={`Edit ${s.planName}, ${when}`}>
                Edit
              </button>
              <button type="button" className="logHomeEdit" onClick={() => onDelete(s.id)} aria-label={`Delete ${s.planName}, ${when}`}>
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default RecentSessions;
