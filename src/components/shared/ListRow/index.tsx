import type { ReactNode } from 'react';
import './ListRow.css';

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** An action or set ticks, shown at the trailing edge. */
  trailing?: ReactNode;
  /** The row being worked on: inverted to white. */
  current?: boolean;
  /** Makes the whole row a button that opens something below it. */
  onClick?: () => void;
  expanded?: boolean;
}

export function ListRow({ title, subtitle, trailing, current, onClick, expanded }: ListRowProps) {
  const className = `list-row${subtitle || current ? ' list-row--tall' : ''}${current ? ' list-row--current' : ''}${onClick ? ' list-row--button' : ''}`;
  const content = (
    <>
      <span className="list-row__text">
        <span className="list-row__title">{title}</span>
        {subtitle && <span className="list-row__subtitle">{subtitle}</span>}
      </span>
      {trailing}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        aria-current={current ? 'true' : undefined}
        aria-expanded={expanded}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div aria-current={current ? 'true' : undefined} className={className}>
      {content}
    </div>
  );
}

export default ListRow;
