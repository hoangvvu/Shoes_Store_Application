import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
}

export function AuthInput({ icon, ...rest }: Props) {
  return (
    <label className="auth-input">
      <span className="auth-input__icon">{icon}</span>
      <input {...rest} />
    </label>
  );
}
