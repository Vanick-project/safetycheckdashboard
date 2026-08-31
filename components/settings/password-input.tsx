'use client';

// ─── components/settings/password-input.tsx ──────────────────────────────────
// Input password réutilisable avec toggle œil individuel.
// Utilisé par PasswordChangeCard (5c.1) et sera réutilisé par le flow reset
// 2FA (5c.3) qui demandera aussi le mot de passe actuel.
//
// Compatible RHF via forwardRef + spread des props register(). L'appelant fait :
//   <PasswordInput id="foo" label="..." error={errors.foo?.message}
//                  {...register('foo')} />

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  /** Message d'erreur inline (rouge sous l'input). */
  error?: string;
  /** Message d'aide inline (gris sous l'input, remplacé par error si présent). */
  hint?: string;
  /** Slot custom sous l'input (pour PasswordStrengthChecklist par exemple). */
  belowSlot?: React.ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { id, label, error, hint, belowSlot, className, disabled, ...inputProps },
    ref,
  ) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>

        <div className="relative">
          <input
            {...inputProps}
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={`
              flex h-10 w-full rounded-md border bg-background px-3 py-2 pr-10
              text-sm shadow-sm transition-colors
              placeholder:text-muted-foreground
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-1
              disabled:cursor-not-allowed disabled:opacity-50
              ${error ? 'border-rose-500 focus-visible:ring-rose-500' : 'border-input'}
              ${className ?? ''}
            `}
          />

          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              inline-flex h-6 w-6 items-center justify-center
              rounded text-muted-foreground transition-colors
              hover:text-foreground
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error ? (
          <p id={`${id}-error`} className="text-xs text-rose-600 dark:text-rose-500">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}

        {belowSlot}
      </div>
    );
  },
);