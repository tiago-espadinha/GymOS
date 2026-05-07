import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
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
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
