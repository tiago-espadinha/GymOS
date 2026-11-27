import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface SheetHeadProps {
  /** id of the title, for the sheet's labelledBy. */
  titleId: string;
  kicker: string;
  title: ReactNode;
  /** The summary line under the title. */
  meta?: ReactNode;
  /** accent: the block across the top, only on a sheet about one plan or session. danger: a confirm. */
  tone?: 'default' | 'accent' | 'danger';
}

/** A bottom sheet's header: the kicker over the title. */
export function SheetHead({ titleId, kicker, title, meta, tone = 'default' }: SheetHeadProps) {
  return (
    <div className={`sheet__head sheet__head--${tone}`}>
      <span className={tone === 'danger' ? 'sheet__kicker sheet__kicker--danger' : 'sheet__kicker'}>{kicker}</span>
      <h2 id={titleId} className="sheet__title">
        {title}
      </h2>
      {meta && <span className="sheet__meta">{meta}</span>}
    </div>
  );
}

/** The choices of a sheet, edge to edge with hairlines between. */
export function SheetRows({ children }: { children: ReactNode }) {
  return <div className="sheet__rows">{children}</div>;
}

interface SheetRowProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'title'> {
  title: string;
  /** The muted words beside the title, or under it with hintUnder. */
  hint?: ReactNode;
  /** For a hint that is a sentence. */
  hintUnder?: boolean;
  tone?: 'default' | 'danger';
}

export function SheetRow({ title, hint, hintUnder, tone = 'default', type = 'button', ...rest }: SheetRowProps) {
  const layout = hintUnder ? ' sheet__row--under' : '';
  return (
    <button {...rest} type={type} className={`sheet__row sheet__row--${tone}${layout}`}>
      <span>{title}</span>
      {hint && <span className="sheet__hint">{hint}</span>}
    </button>
  );
}
