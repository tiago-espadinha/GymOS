import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
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
  /** Covers the whole screen, tab bar included, for a long list such as the plan picker. */
  full?: boolean;
  children: ReactNode;
}

// Open sheets, so a sheet stacked on another doesn't unlock the page when it closes.
let openSheets = 0;

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** a is b, or a comes before b in the document (a containing b counts). */
const atOrBefore = (a: Node, b: Node) =>
  a === b || Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

/**
 * Tab past the last tab stop wraps to the first, Shift+Tab before the first to the
 * last. Positions, not equality: a listbox's roving options (tabIndex -1) can hold
 * focus while not being tab stops.
 */
function keepTabInside(sheet: HTMLElement, e: KeyboardEvent<HTMLElement>) {
  const stops = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.tabIndex >= 0);
  if (stops.length === 0) return;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const active = document.activeElement ?? sheet;
  if (e.shiftKey ? atOrBefore(active, first) : atOrBefore(last, active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}

/**
 * A modal bottom sheet. There is no scrim (the direction forbids translucency);
 * the rest of the page is made inert while it is open, a tap outside only closes
 * it, Tab stays inside it, and focus returns to the control that opened it when
 * that control is still on the page. The control marked data-autofocus, else the
 * first control, gets focus on open, so put the safe choice first. The page
 * behind doesn't scroll while a sheet is open, even when a swipe runs past the
 * end of the sheet's own content.
 */
export function Sheet({ labelledBy, describedBy, role = 'dialog', onClose, full, children }: SheetProps) {
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

    openSheets += 1;
    document.documentElement.classList.add('sheetOpen');

    (sheet.querySelector<HTMLElement>('[data-autofocus]') ?? sheet.querySelector<HTMLElement>(FOCUSABLE) ?? sheet).focus();

    // Close on the click that ends a press begun outside, not on the press itself: closing
    // early un-inerts the page and the click then lands on the control behind. A sheet made
    // inert by another sheet on top of it ignores the press.
    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = !sheet.inert && !sheet.contains(e.target as Node);
    };
    // Every click spends the press, so one that never became a click (a scroll) can't
    // swallow a later keyboard or scripted click.
    const onClick = (e: MouseEvent) => {
      const outside = pressedOutside;
      pressedOutside = false;
      if (!outside || sheet.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      close.current();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick, true);
      madeInert.forEach((el) => (el.inert = false));
      openSheets -= 1;
      if (openSheets === 0) document.documentElement.classList.remove('sheetOpen');
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <section
      ref={ref}
      className={full ? 'sheet sheet--full' : 'sheet'}
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
        if (e.key === 'Tab') keepTabInside(e.currentTarget, e);
      }}
    >
      {children}
    </section>,
    document.body,
  );
}

export default Sheet;
