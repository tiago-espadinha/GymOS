import { useId, useState } from "react";
import { ConfirmSheet, Icon, SecondaryButton, Sheet, SheetHead, SheetRow, SheetRows } from "../../shared";
import { formatDateMeta } from "../../../utils/date";
import { ActiveSession, hasLoggedSets } from "../../../utils/activeSession";
import { sessionTotals } from "../../../utils/sessionList";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { kgTo, weightLabel } from "../../../utils/units";
import DateSheet from "../DateSheet";
import DeleteSessionSheet from "../DeleteSessionSheet";

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
        <SheetHead
          titleId={titleId}
          tone="accent"
          kicker={editing ? `Editing · saved ${date}` : `Session · ${date}`}
          title={session.planName}
          meta={summary}
        />
        <SheetRows>
          {editing && (
            <SheetRow
              title="Change date"
              hint={
                <>
                  {date}
                  <Icon name="chevron-right" />
                </>
              }
              aria-haspopup="dialog"
              onClick={() => setOpen("date")}
            />
          )}
          <SheetRow
            title={editing ? "Discard changes" : "Discard session"}
            hint={editing ? "saved session stays" : "nothing is saved"}
            tone={editing ? "default" : "danger"}
            aria-haspopup={asksFirst ? "dialog" : undefined}
            onClick={discard}
          />
          {editing && (
            <SheetRow title="Delete session" hint="for good" tone="danger" aria-haspopup="dialog" onClick={() => setOpen("delete")} />
          )}
        </SheetRows>
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
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
