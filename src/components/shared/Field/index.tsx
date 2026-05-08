import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { WarningIcon } from '../WarningIcon';
import './Field.css';

interface FieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'id'> {
  label: string;
  error?: string;
}

export function Field({ label, error, ...rest }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [rest['aria-describedby'], error && errorId].filter(Boolean).join(' ') || undefined
        }
      />
      {error && (
        <p id={errorId} className="field__error">
          <WarningIcon />
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
