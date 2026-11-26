import { PATHS, type IconName } from './paths';
import './Icon.css';

interface IconProps {
  name: IconName;
  /** sm 16 inline with text, md 20 in a control, lg 24 on its own, xl 28 beside display type. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/** Decorative: the control around it carries the name. */
export function Icon({ name, size = 'sm', className }: IconProps) {
  return (
    <svg className={`icon icon--${size}${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
