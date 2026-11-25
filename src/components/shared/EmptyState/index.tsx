import { useId } from 'react';
import { PrimaryButton } from '../PrimaryButton';
import './EmptyState.css';

interface EmptyStateProps {
  /** Short label above the title; hidden from screen readers, which get the tab's h1. */
  kicker: string;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
  /** Pass only when the device holds no plans and no sessions. */
  onImport?: () => void;
}

/** The accent block a browse tab shows when it has nothing to list. */
export function EmptyState({ kicker, title, text, action, onAction, onImport }: EmptyStateProps) {
  const titleId = useId();
  return (
    <section className="emptyState" aria-labelledby={titleId}>
      <div className="emptyState__block">
        <span className="emptyState__kicker" aria-hidden="true">
          {kicker}
        </span>
        <h2 id={titleId} className="emptyState__title">
          {title}
        </h2>
        <p className="emptyState__text">{text}</p>
        <PrimaryButton tone="dark" onClick={onAction}>
          {action}
        </PrimaryButton>
      </div>
      {onImport && (
        <button type="button" className="textLink emptyState__import" onClick={onImport}>
          Have a CSV backup? Import it
        </button>
      )}
    </section>
  );
}

export default EmptyState;
