import type { ReactNode } from 'react';
import './ListRow.css';

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** An action or set ticks, shown at the trailing edge. */
  trailing?: ReactNode;
  /** The row being worked on: inverted to white. */
  current?: boolean;
}

export function ListRow({ title, subtitle, trailing, current }: ListRowProps) {
  return (
    <div
      aria-current={current ? 'true' : undefined}
      className={`list-row${subtitle || current ? ' list-row--tall' : ''}${current ? ' list-row--current' : ''}`}
    >
      <div className="list-row__text">
        <span className="list-row__title">{title}</span>
        {subtitle && <span className="list-row__subtitle">{subtitle}</span>}
      </div>
      {trailing}
    </div>
  );
}

export default ListRow;
