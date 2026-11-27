import { useEffect, useState, type ReactNode } from "react";
import "./TimerBlock.css";

interface TimerBlockProps {
  tone: "hold" | "rest";
  label: string;
  setNumber: number;
  /** Top right; "Set n" unless given, e.g. "Set 2 of 3" or "Plank · set 3 next". */
  meta?: string;
  countdown: string;
  /** The line under the countdown, e.g. "of 01:30". */
  caption: string;
  fillPct: number;
  /** The fill is growing (a running rest or hold): its top edge waves. */
  filling?: boolean;
  // Announced when it changes, so it names phases, never seconds.
  status: string;
  /** The buttons below the block (End rest, Pause, Stop and Resume). */
  actions?: ReactNode;
  /** The row inside the block, while the timer runs. */
  children?: ReactNode;
}

// The block fills from the bottom as time passes. The countdown is drawn twice,
// once on the empty part and once, inverted, on the filled part; the fill clips
// the second copy, so the numeral stays readable without any blend mode.
export function TimerBlock({ tone, label, setNumber, meta, countdown, caption, fillPct, filling = false, status, actions, children }: TimerBlockProps) {
  // A live region only announces changes, so it is filled once the block has mounted.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setArmed(true), 100);
    return () => clearTimeout(id);
  }, []);

  const face = (
    <>
      <div className="timerBlockTop">
        <span>{label}</span>
        <span>{meta ?? `Set ${setNumber}`}</span>
      </div>
      <div className="timerBlockCountdown">{countdown}</div>
      <div className="timerBlockTarget">{caption}</div>
    </>
  );

  // Flat when empty or full, so a finished block is one solid colour.
  const wave = filling && fillPct > 0 && fillPct < 100;

  return (
    <div className={`timerUnit timerUnit--${tone}${actions ? " timerUnit--actions" : ""}`}>
      <section className={`timerBlock timerBlock--${tone}${wave ? " timerBlock--filling" : ""}`} aria-label={`${label} timer`}>
        <div className="timerBlockFace" role="timer" aria-label={`${label}, ${countdown}`}>
          {face}
        </div>
        <div className="timerBlockFill" style={{ height: `${fillPct}%` }} aria-hidden="true">
          <div className="timerBlockFace timerBlockFace--onFill">{face}</div>
        </div>
        <div className="timerBlockControls">{children}</div>
        <span role="status" className="timerBlockAnnounce">
          {armed ? status : ""}
        </span>
      </section>
      {actions && <div className="timerActions">{actions}</div>}
    </div>
  );
}

export function TimerButton({ onClick, disabled, endRest, children }: { onClick: () => void; disabled?: boolean; endRest?: boolean; children: ReactNode }) {
  return (
    // data-end-rest: Set done hands its focus to this button.
    <button type="button" className="timerBlockButton" onClick={onClick} disabled={disabled} data-end-rest={endRest || undefined}>
      {children}
    </button>
  );
}
