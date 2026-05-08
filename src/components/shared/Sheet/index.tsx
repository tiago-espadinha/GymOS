import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import './Sheet.css';

interface SheetProps {
  /** id of the heading that names the sheet. */
  labelledBy: string;
  describedBy?: string;
  /** alertdialog for a confirmation that needs an answer. */
  role?: 'dialog' | 'alertdialog';
  /** Escape, Cancel or a tap outside the sheet. */
  onClose: () => void;
  /** Gets focus when the sheet opens; the first control otherwise. */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A modal bottom sheet. There is no scrim (the direction forbids translucency);
 * the rest of the page is made inert while it is open, and focus returns to the
 * control that opened it when that control is still on the page.
 */
export function Sheet({ labelledBy, describedBy, role = 'dialog', onClose, initialFocus, children }: SheetProps) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const sheet = ref.current;
    if (!sheet) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const madeInert: HTMLElement[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el instanceof HTMLElement && el !== sheet && !el.inert) {
        el.inert = true;
        madeInert.push(el);
      }
    }

    (initialFocus?.current ?? sheet.querySelector<HTMLElement>(FOCUSABLE) ?? sheet).focus();

    const onPointerDown = (e: PointerEvent) => {
      if (!sheet.contains(e.target as Node)) close.current();
    };
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      madeInert.forEach((el) => (el.inert = false));
      if (opener?.isConnected) opener.focus();
    };
  }, [initialFocus]);

  return createPortal(
    <section
      ref={ref}
      className="sheet"
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {children}
    </section>,
    document.body,
  );
}

export default Sheet;
