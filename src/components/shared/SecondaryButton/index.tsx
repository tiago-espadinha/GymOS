import type { ButtonHTMLAttributes } from 'react';
import './SecondaryButton.css';

interface SecondaryButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  /** danger: the destructive answer, outlined in the danger colour. */
  tone?: 'default' | 'danger';
}

/** The 64 outlined pill: every full-width action that isn't the primary one. */
export function SecondaryButton({
  tone = 'default',
  type = 'button',
  children,
  ...rest
}: SecondaryButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`secondary-button secondary-button--${tone}`}
    >
      {children}
    </button>
  );
}

export default SecondaryButton;
