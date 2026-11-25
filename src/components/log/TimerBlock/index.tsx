import { useEffect, useState, type ReactNode } from "react";
import "./TimerBlock.css";

interface TimerBlockProps {
  tone: "hold" | "rest";
  label: string;
  setNumber: number;
  /** Top right; "Set n" unless given, e.g. "Set 2 of 3" or "Plank · set 3 next". */
  meta?: string;
  countdown: string;
  /** The line under the countdown, e.g. "Target 01:30". */
  caption: string;
  fillPct: number;
  // Announced when it changes, so it names phases, never seconds.
  status: string;
  children: ReactNode;
}

// The block fills from the bottom as time passes. The countdown is drawn twice,
// once on the empty part and once, inverted, on the filled part; the fill clips
// the second copy, so the numeral stays readable without any blend mode.
export function TimerBlock({ tone, label, setNumber, meta, countdown, caption, fillPct, status, children }: TimerBlockProps) {
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

  return (
    <section className={`timerBlock timerBlock--${tone}`} aria-label={`${label} timer`}>
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
  );
}

// wide: takes twice the room, for a label that would wrap ("End rest").
export function TimerButton({ onClick, disabled, wide, children }: { onClick: () => void; disabled?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={`timerBlockButton${wide ? " timerBlockButton--wide" : ""}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
