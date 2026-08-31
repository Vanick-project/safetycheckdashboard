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

// ─── Change password ──────────────────────────────────────────────────────────
//
// Policy IDENTIQUE au backend (POST /admin/me/change-password Zod schema) :
//   - min 12 chars, max 200
//   - au moins 1 majuscule
//   - au moins 1 chiffre
//   - au moins 1 caractère spécial
//   - newPassword !== currentPassword (superRefine)
//   - confirmNewPassword === newPassword (règle purement UI, non envoyée)
//
// Les regex sont dupliquées avec PASSWORD_RULES du checklist visuel — c'est
// intentionnel pour garder deux sources indépendantes de vérité, mais
// SI ON EDITE ICI on doit éditer là-bas et backend simultanément (3 endroits).
// Dette technique à traiter un jour en factorisant dans un module partagé.

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis').max(200),
    newPassword: z
      .string()
      .min(12, 'Le nouveau mot de passe doit contenir au moins 12 caractères')
      .max(200)
      .regex(/[A-Z]/, 'Au moins une majuscule requise')
      .regex(/[0-9]/, 'Au moins un chiffre requis')
      .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial requis'),
    confirmNewPassword: z.string().min(1, 'Confirmation requise'),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmNewPassword'],
        message: 'Les mots de passe ne correspondent pas',
      });
    }
    if (data.newPassword && data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'Le nouveau mot de passe doit être différent de l\u2019actuel',
      });
    }
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;