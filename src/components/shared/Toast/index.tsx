import { useEffect, useRef, useState } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  /** Called when the time runs out. */
  onDismiss: () => void;
  /** In the flow of a sticky bar (New plan's Save) instead of fixed above the tab bar. */
  inline?: boolean;
}

// How long Undo stays offered; paused while the toast has focus or the pointer.
const UNDO_MS = 6000;

/** The white pill above the tab bar, with one action (Undo). Key it per item so the time restarts. */
export function Toast({ message, actionLabel, onAction, onDismiss, inline = false }: ToastProps) {
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => dismiss.current(), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [paused]);

  return (
    <div
      className={`toast${inline ? ' toast--inline' : ''}`}
      role="status"
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <span className="toast__message">{message}</span>
      <button type="button" className="toast__action" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

export default Toast;
