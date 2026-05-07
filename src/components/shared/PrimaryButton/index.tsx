import type { ButtonHTMLAttributes } from 'react';
import './PrimaryButton.css';

/**
 * light: white fill, black text, for use on a black screen (inside a session).
 * dark: black fill, lime text, for use on a lime block.
 */
export type PrimaryTone = 'light' | 'dark';

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
