import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon';
import type { IconName } from '../Icon/paths';
import './IconButton.css';

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'children' | 'aria-label'> {
  icon: IconName;
  /** The button's name: it has no visible words. */
  'aria-label': string;
  /** large: 72, beside a primary button. */
  size?: 'default' | 'large';
}

/** A circle with a grey outline around one icon. */
export function IconButton({ icon, size = 'default', type = 'button', ...rest }: IconButtonProps) {
  return (
    <button {...rest} type={type} className={`icon-button icon-button--${size}`}>
      <Icon name={icon} size="md" />
    </button>
  );
}

export default IconButton;
