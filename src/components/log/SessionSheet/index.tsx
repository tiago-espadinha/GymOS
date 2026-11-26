import { useId, useState } from "react";
import { ConfirmSheet, Icon, Sheet } from "../../shared";
import { formatDateMeta } from "../../../utils/date";
import { ActiveSession, hasLoggedSets } from "../../../utils/activeSession";
import { sessionTotals } from "../../../utils/sessionList";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { kgTo, weightLabel } from "../../../utils/units";
import DateSheet from "../DateSheet";
import DeleteSessionSheet from "../DeleteSessionSheet";
import "./SessionSheet.css";

interface SessionSheetProps {
  session: ActiveSession;
  /** Changes the date of the saved session being edited. */
  onDate: (date: string) => void;
  /** Ends the session without saving, after any confirm. */
  onDiscard: () => void;
  /** Deletes the saved session being edited, after its confirm. */
  onDelete: () => void;
  onClose: () => void;
}

/**
 * The session list's ⋯ sheet: an accent block naming the session, then what ends
 * or changes it without Finish. A new session can only be discarded; an edited
 * one can change date, drop its changes or be deleted. The confirms open on top
 * of this sheet, so backing out of one returns to its row.
 */
export function SessionSheet({ session, onDate, onDiscard, onDelete, onClose }: SessionSheetProps) {
  const titleId = useId();
  const units = useUnitPrefs();
  const [open, setOpen] = useState<"date" | "discard" | "delete" | null>(null);
  const editing = Boolean(session.editingId);
  const date = formatDateMeta(session.date);
  const { sets, volume } = sessionTotals(session.exercises);
  const setCount = `${sets} ${sets === 1 ? "set" : "sets"}`;
  const summary = editing
    ? [setCount, volume > 0 && `${Math.round(kgTo(volume, units.weight)).toLocaleString("en-US")} ${weightLabel(units.weight)}`]
        .filter(Boolean)
        .join(" · ")
    : sets > 0
      ? `${setCount} logged`
      : "No sets logged";

  // With nothing logged there is nothing to lose, so a new session ends at once.
  const asksFirst = editing || hasLoggedSets(session);
  const discard = () => (asksFirst ? setOpen("discard") : onDiscard());

  return (
    <>
      <Sheet labelledBy={titleId} onClose={onClose}>
        <div className="sessionSheet__head">
          <span className="sheet__kicker">{editing ? `Editing · saved ${date}` : `Session · ${date}`}</span>
          <h2 id={titleId} className="sheet__title">
            {session.planName}
          </h2>
          <span className="sessionSheet__meta">{summary}</span>
        </div>
        <div className="sessionSheet__rows">
          {editing && (
            <button type="button" className="sessionSheet__row" aria-haspopup="dialog" onClick={() => setOpen("date")}>
              <span>Change date</span>
              <span className="sessionSheet__hint">
                {date}
                <Icon name="chevron-right" />
              </span>
            </button>
          )}
          <button
            type="button"
            className={`sessionSheet__row${editing ? "" : " sessionSheet__row--danger"}`}
            aria-haspopup={asksFirst ? "dialog" : undefined}
            onClick={discard}
          >
            <span>{editing ? "Discard changes" : "Discard session"}</span>
            <span className="sessionSheet__hint">{editing ? "saved session stays" : "nothing is saved"}</span>
          </button>
          {editing && (
            <button
              type="button"
              className="sessionSheet__row sessionSheet__row--danger"
              aria-haspopup="dialog"
              onClick={() => setOpen("delete")}
            >
              <span>Delete session</span>
              <span className="sessionSheet__hint">for good</span>
            </button>
          )}
        </div>
        <button type="button" className="sessionSheet__close" onClick={onClose}>
          Close
        </button>
      </Sheet>

      {open === "date" && <DateSheet value={session.date} onChange={onDate} onClose={() => setOpen(null)} />}
      {open === "discard" && (
        <ConfirmSheet
          kicker="Discard"
          title={editing ? "Discard your changes?" : "Discard this session?"}
          text={
            editing
              ? "Your changes are lost. The saved session stays as it was."
              : "The sets you logged are lost. Nothing is saved to Log or Stats."
          }
          confirmLabel={editing ? "Discard changes" : "Discard session"}
          onConfirm={onDiscard}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "delete" && (
        <DeleteSessionSheet planName={session.planName} date={session.date} onDelete={onDelete} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

export default SessionSheet;
