import type { ButtonHTMLAttributes } from 'react';
import './PrimaryButton.css';

/**
 * light: white fill, black text, for use on a black screen (inside a session).
 * dark: black fill, accent text, for use on an accent block.
 * accent: accent fill, black text, the primary action outside a session, and the
 *   actions that log a set inside one (Set done, Stop and log).
 */
export type PrimaryTone = 'light' | 'dark' | 'accent';

interface PrimaryButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  tone?: PrimaryTone;
}

export function PrimaryButton({
  tone = 'light',
  type = 'button',
  children,
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`primary-button primary-button--${tone}`}
    >
      {children}
    </button>
  );
}

export default PrimaryButton;
