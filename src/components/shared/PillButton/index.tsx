import type { ButtonHTMLAttributes } from 'react';
import './PillButton.css';

/**
 * lime: filled lime (Start)
 * white: filled white (+ New plan)
 * outline-white: outlined white (Finish)
 * outline-black: outlined black, for use on a filled block
 */
export type PillVariant = 'lime' | 'white' | 'outline-white' | 'outline-black';

interface PillButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  variant?: PillVariant;
}

export function PillButton({
  variant = 'white',
  type = 'button',
  children,
  ...rest
}: PillButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`pill-button pill-button--${variant}`}
    >
      {children}
    </button>
  );
}

export default PillButton;
