import { useEffect, useId, useRef, useState } from "react";
import { Icon, PrimaryButton, SaveFailedAlert } from "../../shared";
import { formatDateMeta } from "../../../utils/date";
import { exerciseSummary, sessionTotals } from "../../../utils/sessionList";
import { isLoggedSet, ActiveSession } from "../../../utils/activeSession";
import DateSheet from "../DateSheet";
import "./FinishScreen.css";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { kgTo, weightLabel } from "../../../utils/units";

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
  /** "‹ Session": back to where Finish was pressed. */
  onBack: () => void;
}

export function FinishScreen({ session, onNotes, onDate, onSave, saveFailures, onDownload, onBack }: FinishScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  const notesId = useId();
  const [dateOpen, setDateOpen] = useState(false);
  const editing = Boolean(session.editingId);
  const saveFailed = saveFailures > 0;
  const units = useUnitPrefs();
  const totals = sessionTotals(session.exercises);
  const rows = session.exercises.filter((ex) => ex.sets.some(isLoggedSet));
  const stats = [
    { value: totals.exercises, label: totals.exercises === 1 ? "exercise" : "exercises" },
    { value: totals.sets, label: totals.sets === 1 ? "set" : "sets" },
    ...(totals.volume > 0
      ? [{ value: Math.round(kgTo(totals.volume, units.weight)).toLocaleString("en-US"), label: `${weightLabel(units.weight)} moved` }]
      : []),
  ];

  return (
    <div>
      <button type="button" className="finishBack" onClick={onBack}>
        <span aria-hidden="true">‹ </span>Session
      </button>
      <section className="finishHero" aria-labelledby="finishTitle">
        {editing ? (
          <p className="finishKicker">
            Editing ·{" "}
            <button type="button" className="finishDate" aria-haspopup="dialog" onClick={() => setDateOpen(true)}>
              <span className="visuallyHidden">Session date: </span>
              {formatDateMeta(session.date)}
              <Icon name="chevron-down" />
            </button>
          </p>
        ) : (
          <p className="finishKicker">
            {session.planName} · {formatDateMeta(session.date)}
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
            <span className="finishRowSets">{exerciseSummary(ex, units)}</span>
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
          {saveFailed ? "Try again" : editing ? "Save changes" : "Save session"}
        </PrimaryButton>
        {saveFailed && (
          <button type="button" className="finishDownload" onClick={onDownload}>
            Download this session (CSV)
          </button>
        )}
      </div>

      {dateOpen && <DateSheet value={session.date} onChange={onDate} onClose={() => setDateOpen(false)} />}
    </div>
  );
}

export default FinishScreen;
