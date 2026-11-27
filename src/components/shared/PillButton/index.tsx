import type { ButtonHTMLAttributes } from 'react';
import './PillButton.css';

/**
 * The compact button, a 44 pill inside a row or header:
 *
 * accent: filled in the accent colour (Start)
 * white: filled white (Create New)
 * outline-white: outlined white (Finish)
 * outline-black: outlined black, for use on a filled block
 * outline-danger: outlined in the danger colour (Delete)
 */
export type PillVariant = 'accent' | 'white' | 'outline-white' | 'outline-black' | 'outline-danger';

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
