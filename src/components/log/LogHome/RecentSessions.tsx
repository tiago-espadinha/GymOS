import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatDateFull } from "../../../utils/date";
import { newestFirst, sessionCells, sessionPlanKey, sessionPlans, sessionStats, sessionSummary } from "../../../utils/sessions";
import { WorkoutSession } from "../../../types";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { ALL, PlanFilter } from "./PlanFilter";

const RECENT_COUNT = 6;
const MORE_COUNT = 10;

interface RecentSessionsProps {
  sessions: WorkoutSession[];
  onEdit: (session: WorkoutSession) => void;
  justSaved: { id: string; label: string } | null;
  /** Shown under the label while nothing has been saved. */
  empty: ReactNode;
}

interface SessionRowProps {
  session: WorkoutSession;
  onEdit: (session: WorkoutSession) => void;
  /** The "Just saved" or "Updated" kicker when this is the session just saved. */
  savedLabel?: string;
}

function SessionRow({ session, onEdit, savedLabel }: SessionRowProps) {
  const { weight } = useUnitPrefs();
  const when = formatDateFull(session.date);
  const stats = sessionStats(session);
  const cells = sessionCells(stats, session.notes, weight);
  return (
    <li className={savedLabel ? "logHomeItem logHomeItem--saved" : "logHomeItem"}>
      <div className="logHomeItemText">
        {savedLabel && <span className="logHomeItemKicker">{savedLabel}</span>}
        <span className="logHomeItemHead">
          <span className="logHomeItemTitle">{session.planName}</span>
          <span className="logHomeItemMeta">{when}</span>
        </span>
        <span className="logHomeItemMeta logHomeItemSummary">{sessionSummary(stats, session.notes, weight)}</span>
        {/* Wide only: the summary as table cells. */}
        <span className="logHomeItemCell">{cells.sets}</span>
        <span className="logHomeItemCell">{cells.volume}</span>
        <span className="logHomeItemCell logHomeItemNotes">{cells.notes}</span>
      </div>
      <button type="button" className="logHomeEdit" onClick={() => onEdit(session)} aria-label={`Edit ${session.planName}, ${when}`}>
        Edit
      </button>
    </li>
  );
}

// The newest sessions, growing 10 at a time, optionally narrowed to one plan.
export function RecentSessions({ sessions, onEdit, justSaved, empty }: RecentSessionsProps) {
  const [planKey, setPlanKey] = useState(ALL);
  const [shown, setShown] = useState(RECENT_COUNT);
  const plans = sessionPlans(sessions);
  // A plan whose last session was deleted meanwhile falls back to All.
  const filter = plans.some((p) => p.key === planKey) ? planKey : ALL;
  const matching = newestFirst(sessions).filter((s) => filter === ALL || sessionPlanKey(s) === filter);
  const visible = matching.slice(0, shown);
  const paged = matching.length > RECENT_COUNT;
  const hasMore = visible.length < matching.length;

  // Show more moves focus to the first row it added, since the button may be gone.
  const listRef = useRef<HTMLUListElement>(null);
  const firstAdded = useRef<number | null>(null);
  useEffect(() => {
    if (firstAdded.current === null) return;
    listRef.current?.children[firstAdded.current]?.querySelector("button")?.focus();
    firstAdded.current = null;
  }, [shown]);

  const pick = (key: string) => {
    setPlanKey(key);
    setShown(RECENT_COUNT);
  };
  const showMore = () => {
    firstAdded.current = visible.length;
    setShown(visible.length + MORE_COUNT);
  };

  return (
    <section aria-labelledby="logHomeRecentTitle" className={visible.length ? "logHomeRecent" : "logHomeRecent logHomeRecent--empty"}>
      <div className="logHomeRecentHead">
        <h2 id="logHomeRecentTitle" className="logHomeLabel">
          Recent sessions
        </h2>
        <span className="logHomeRecentTools">
          {hasMore && (
            <span className="logHomeRecentCount">
              {visible.length} of {matching.length}
              <span className="visuallyHidden"> shown</span>
            </span>
          )}
          {plans.length > 1 && <PlanFilter plans={plans} total={sessions.length} value={filter} onChange={pick} />}
        </span>
      </div>
      {visible.length === 0 ? (
        empty
      ) : (
        <ul ref={listRef} className="logHomeList" role="list">
          {visible.map((s) => (
            <SessionRow key={s.id} session={s} onEdit={onEdit} savedLabel={s.id === justSaved?.id ? justSaved.label : undefined} />
          ))}
        </ul>
      )}
      {hasMore && (
        <div className="logHomeMoreWrap">
          <button type="button" className="logHomeShowMore" onClick={showMore}>
            Show more
          </button>
        </div>
      )}
      {paged && !hasMore && <p className="logHomeEnd">All {matching.length} shown</p>}
    </section>
  );
}

export default RecentSessions;
