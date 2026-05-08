import { useEffect, useRef } from "react";
import { Field, PrimaryButton, SaveFailedAlert } from "../../shared";
import { formatDateKicker } from "../../../utils/date";
import { exerciseSummary, sessionTotals } from "../../../utils/sessionList";
import { isLoggedSet, ActiveSession } from "../../../utils/activeSession";
import "./FinishScreen.css";

interface FinishScreenProps {
  session: ActiveSession;
  onNotes: (notes: string) => void;
  onSave: () => void;
  /** The last Save was refused by the browser; nothing was stored. */
  saveFailed: boolean;
  /** Saves the unsaved session as a CSV file, offered after a failed save. */
  onDownload: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export function FinishScreen({ session, onNotes, onSave, saveFailed, onDownload, onBack, onCancel }: FinishScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  const totals = sessionTotals(session.exercises);
  const rows = session.exercises.filter((ex) => ex.sets.some(isLoggedSet));
  const stats = [
    { value: totals.exercises, label: totals.exercises === 1 ? "exercise" : "exercises" },
    { value: totals.sets, label: totals.sets === 1 ? "set" : "sets" },
    ...(totals.volume > 0
      ? [{ value: Math.round(totals.volume).toLocaleString("en-US"), label: "kg moved" }]
      : []),
  ];

  return (
    <div>
      <section className="finishHero" aria-labelledby="finishTitle">
        <p className="finishKicker">
          {session.planName} · {formatDateKicker(session.date)}
        </p>
        <h1 id="finishTitle" className="finishTitle" ref={titleRef} tabIndex={-1}>
          Done
        </h1>
        <dl className="finishStats">
          {stats.map((s) => (
            <div key={s.label} className="finishStat">
              <dt className="finishStatLabel">{s.label}</dt>
              <dd className="finishStatValue">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {saveFailed && (
        <div className="finishAlert">
          <SaveFailedAlert>
            This browser refused to store the session: storage is full or blocked. Your sets are still on this
            screen. Try again, or download them so nothing is lost.
          </SaveFailedAlert>
        </div>
      )}

      <ul className="finishRows" role="list">
        {rows.map((ex) => (
          <li key={ex.id} className="finishRow">
            <span className="finishRowName">{ex.name}</span>
            <span className="finishRowSets">{exerciseSummary(ex)}</span>
          </li>
        ))}
      </ul>

      <div className="finishActions">
        <Field
          label="Notes · optional"
          value={session.notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="How did it go? Any PRs or setbacks?"
        />
        <PrimaryButton onClick={onSave}>
          {saveFailed ? "Try again" : session.editingId ? "Update session" : "Save session"}
        </PrimaryButton>
        {saveFailed && (
          <button type="button" className="finishDownload" onClick={onDownload}>
            Download this session (CSV)
          </button>
        )}
        <button type="button" className="textLink" onClick={onBack}>
          Back to logging
        </button>
        <button type="button" className="textLink" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default FinishScreen;
