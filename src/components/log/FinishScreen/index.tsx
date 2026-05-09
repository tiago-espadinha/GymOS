import { useEffect, useId, useRef, useState } from "react";
import { ChevronIcon, PrimaryButton, SaveFailedAlert } from "../../shared";
import { formatDateFull, formatDateKicker } from "../../../utils/date";
import { exerciseSummary, sessionTotals } from "../../../utils/sessionList";
import { isLoggedSet, ActiveSession } from "../../../utils/activeSession";
import DateSheet from "../DateSheet";
import DeleteSessionSheet from "../DeleteSessionSheet";
import "./FinishScreen.css";

interface FinishScreenProps {
  session: ActiveSession;
  onNotes: (notes: string) => void;
  /** Changes the date of a saved session being edited; a new one picks its date before starting. */
  onDate: (date: string) => void;
  onSave: () => void;
  /** Saves refused by the browser in a row; nothing was stored while above 0. */
  saveFailures: number;
  /** Saves the unsaved session as a CSV file, offered after a failed save. */
  onDownload: () => void;
  onBack: () => void;
  /** Cancel for a new session, Discard changes for an edited one. */
  onCancel: () => void;
  /** Deletes the saved session being edited, after the confirm sheet. */
  onDelete: () => void;
}

export function FinishScreen({ session, onNotes, onDate, onSave, saveFailures, onDownload, onBack, onCancel, onDelete }: FinishScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  const notesId = useId();
  const [open, setOpen] = useState<"date" | "delete" | null>(null);
  const editing = Boolean(session.editingId);
  const saveFailed = saveFailures > 0;
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
        {editing ? (
          <p className="finishKicker">
            Editing ·{" "}
            <button type="button" className="finishDate" aria-haspopup="dialog" onClick={() => setOpen("date")}>
              <span className="visuallyHidden">Session date: </span>
              Saved {formatDateFull(session.date)}
              <ChevronIcon />
            </button>
          </p>
        ) : (
          <p className="finishKicker">
            {session.planName} · {formatDateKicker(session.date)}
          </p>
        )}
        <h1 id="finishTitle" className="finishTitle" ref={titleRef} tabIndex={-1}>
          {editing ? session.planName : "Done"}
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

      <ul className="finishRows" role="list">
        {rows.map((ex) => (
          <li key={ex.id} className="finishRow">
            <span className="finishRowName">{ex.name}</span>
            <span className="finishRowSets">{exerciseSummary(ex)}</span>
          </li>
        ))}
      </ul>

      <div className="finishActions">
        {/* Keyed on the count, so a refused Try again is announced again. */}
        {saveFailed && (
          <SaveFailedAlert key={saveFailures}>
            This browser refused to store the session: storage is full or blocked. Your sets are still on this
            screen. Try again, or download them so nothing is lost.
          </SaveFailedAlert>
        )}
        <div className="field">
          <label htmlFor={notesId} className="field__label">
            Notes · optional
          </label>
          <textarea
            id={notesId}
            className="field__input finishNotes"
            rows={3}
            value={session.notes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder="How did it go? Any PRs or setbacks?"
          />
        </div>
        <PrimaryButton onClick={onSave}>
          {saveFailed ? "Try again" : editing ? "Update session" : "Save session"}
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
          {editing ? "Discard changes" : "Cancel"}
        </button>
        {editing && (
          <button type="button" className="finishDelete" onClick={() => setOpen("delete")}>
            Delete session
          </button>
        )}
      </div>

      {open === "date" && <DateSheet value={session.date} onChange={onDate} onClose={() => setOpen(null)} />}
      {open === "delete" && (
        <DeleteSessionSheet
          planName={session.planName}
          date={session.date}
          onDelete={onDelete}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

export default FinishScreen;
