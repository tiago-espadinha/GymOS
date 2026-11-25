import { useId, useRef, useState, type ReactNode } from "react";

interface MetricInfoProps {
  /** The metric control; the info button sits at the end of its row. */
  children: ReactNode;
  label: string;
  text: string;
}

function InfoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="6.5" r="1.25" fill="currentColor" />
      <path d="M11 9.5v6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A discreet "i" beside the metric control that shows what the selected metric measures.
 * It stays open while the metric changes, so tapping through the metrics explains each one.
 */
export function MetricInfo({ children, label, text }: MetricInfoProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const closeOnEscape = (event: React.KeyboardEvent) => {
    if (!open || event.key !== "Escape") return;
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div className="progressMetric" onKeyDown={closeOnEscape}>
      <div className="progressMetricRow">
        {children}
        <button
          type="button"
          ref={button}
          className="progressInfo"
          aria-label={`About ${label}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          <InfoIcon />
        </button>
      </div>
      <div id={panelId} className="progressInfoPanel" hidden={!open}>
        <p>
          <b>{label}</b> · {text}
        </p>
        <p className="progressInfoPR">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
            <circle cx="7" cy="7" r="5" fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth="3" />
          </svg>
          A PR is a session that beat every earlier one on this metric.
        </p>
      </div>
    </div>
  );
}
