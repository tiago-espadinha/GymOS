import { useEffect, useRef, useState } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  /** Called when the time runs out. */
  onDismiss: () => void;
  /** ms before the toast goes; paused while it has focus or the pointer. */
  duration?: number;
}

/** The white pill above the tab bar, with one action (Undo). */
export function Toast({ message, actionLabel, onAction, onDismiss, duration = 6000 }: ToastProps) {
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => dismiss.current(), duration);
    return () => window.clearTimeout(t);
  }, [paused, duration, message]);

  return (
    <div
      className="toast"
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
