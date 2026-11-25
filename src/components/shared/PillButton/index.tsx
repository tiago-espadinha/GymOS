import type { ButtonHTMLAttributes } from 'react';
import './PillButton.css';

/**
 * lime: filled lime (Start)
 * white: filled white (+ Create New)
 * outline-white: outlined white (Finish)
 * outline-black: outlined black, for use on a filled block
 * outline-danger: outlined in the danger colour (Delete)
 */
export type PillVariant = 'lime' | 'white' | 'outline-white' | 'outline-black' | 'outline-danger';

interface PillButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  variant?: PillVariant;
  /** compact: body type at 14px, for secondary row actions (Restore, Delete). */
  size?: 'default' | 'compact';
}

export function PillButton({
  variant = 'white',
  size = 'default',
  type = 'button',
  children,
  ...rest
}: PillButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`pill-button pill-button--${variant}${size === 'compact' ? ' pill-button--compact' : ''}`}
    >
      {children}
    </button>
  );
}

export default PillButton;
