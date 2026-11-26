import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../shared";

interface MetricInfoProps {
  /** The metric control; the info button sits at the end of its row. */
  children: ReactNode;
  label: string;
  text: string;
}

/**
 * A discreet "i" beside the metric control that shows what the selected metric measures.
 * The explanation is a callout over the figures and chart, its notch on the selected segment.
 * It stays open while the metric changes, so tapping through the metrics explains each one.
 */
export function MetricInfo({ children, label, text }: MetricInfoProps) {
  const [open, setOpen] = useState(false);
  const [notchX, setNotchX] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  // Point the notch at the centre of the selected segment, and keep it there on resize.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const box = root.current?.getBoundingClientRect();
      const seg = root.current?.querySelector('[aria-pressed="true"]')?.getBoundingClientRect();
      setNotchX(box && seg ? seg.left + seg.width / 2 - box.left : null);
    };
    place();
    const observer = new ResizeObserver(place);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [open, label]);

  // A tap outside the metric block only closes the callout; it does not also act on what it hit.
  // A keyboard press (a click with detail 0) closes it and still goes through.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (root.current?.contains(event.target as Node)) return;
      if (event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
      }
      setOpen(false);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === "Escape") close(true);
    // Tabbing on past the close button leaves the callout, so it does not cover where focus lands.
    if (event.key === "Tab" && !event.shiftKey && event.target === closeButton.current) close(false);
  };

  return (
    <div className="progressMetric" ref={root} onKeyDown={onKeyDown}>
      <div className="progressMetricRow">
        {children}
        <button
          type="button"
          ref={button}
          className="progressInfo"
          aria-label={`About ${label}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setNotchX(null);
            setOpen(!open);
          }}
        >
          <Icon name="info" size="lg" />
        </button>
      </div>
      <div id={panelId} className="progressInfoPanel" hidden={!open}>
        {notchX !== null && <span className="progressInfoNotch" style={{ left: notchX }} aria-hidden="true" />}
        <div className="progressInfoHead">
          <p className="progressInfoKicker">About {label}</p>
          <button
            type="button"
            ref={closeButton}
            className="progressInfoClose"
            aria-label={`Close ${label} info`}
            onClick={() => close(true)}
          >
            <Icon name="close" size="md" />
          </button>
        </div>
        <p>{text}</p>
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
