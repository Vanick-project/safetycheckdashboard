'use client';

import { Check, X } from 'lucide-react';

interface PasswordStrengthChecklistProps {
  password: string;
}

// ─── Règles password ─────────────────────────────────────────────────────────
//
// À maintenir EN SYNC avec la validation Zod du backend
// (src/routes/admin/admins.ts, acceptInvitationBodySchema.password).
// Ces règles refusent les mdp faibles type "Password1" — un compte admin
// a un pouvoir CRUD complet, on ne veut pas de credential stuffing facile.
//
// Note : on n'ajoute PAS de règle "pas dans le top 10k mdp compromis"
// côté client parce que ça nécessiterait Have I Been Pwned API et un
// pattern k-anonymity. Si on veut aller plus loin plus tard, ce sera
// côté backend au moment du POST /accept-invitation.

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: 'Au moins 12 caractères',
    test: (p) => p.length >= 12,
  },
  {
    id: 'uppercase',
    label: 'Au moins une majuscule (A-Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'digit',
    label: 'Au moins un chiffre (0-9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'Au moins un caractère spécial (!@#$…)',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

/** Retourne true si toutes les règles passent. Utilisé pour disable le
 *  bouton submit tant que le password n'est pas valide. */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

export function PasswordStrengthChecklist({
  password,
}: PasswordStrengthChecklistProps) {
  return (
    <ul
      className="space-y-1.5 text-xs"
      aria-label="Exigences du mot de passe"
    >
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 transition-colors ${
              passed
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-muted-foreground'
            }`}
          >
            <span
              className={`
                flex h-4 w-4 shrink-0 items-center justify-center
                rounded-full
                ${
                  passed
                    ? 'bg-emerald-100 dark:bg-emerald-950/60'
                    : 'bg-muted'
                }
              `}
              aria-hidden
            >
              {passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3 opacity-50" />
              )}
            </span>
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}