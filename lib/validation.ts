// ─── lib/validation.ts ────────────────────────────────────────────────────────
// Schémas Zod partagés — miroir de ceux du backend (auth.ts).
// On garde la validation permissive (le backend re-vérifie tout de toute façon),
// mais assez stricte pour catch les erreurs UI (email malformé, code TOTP vide).

import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email requis')
    .email('Email invalide')
    .max(255),
  password: z
    .string()
    .min(1, 'Mot de passe requis')
    .max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── 2FA code ─────────────────────────────────────────────────────────────────
//
// Le backend accepte 6-10 caractères (espaces tolérés). On normalise côté client
// en ne gardant que les chiffres, ce qui donne toujours 6 chars.
export const twoFactorCodeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(
      z
        .string()
        .regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
    ),
});

export type TwoFactorCodeInput = z.infer<typeof twoFactorCodeSchema>;