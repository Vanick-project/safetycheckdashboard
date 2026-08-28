'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';
import { adminErrorMessage } from '@/lib/admin-helpers';
import { ApiError } from '@/lib/types';
import type {
  AcceptInvitationBody,
  AcceptInvitationResponse,
} from '@/lib/admin-types';
import {
  PASSWORD_RULES,
  PasswordStrengthChecklist,
  isPasswordValid,
} from './password-strength-checklist';

// ─── Schema formulaire ───────────────────────────────────────────────────────
//
// Doit MATCH acceptInvitationBodySchema côté backend :
//   - name : trim, min 1, max 100
//   - password : min 12, ≥1 majuscule, ≥1 chiffre, ≥1 spécial
//
// On ajoute côté frontend passwordConfirmation (UX) qui n'existe pas backend
// — c'est purement de la validation de saisie.

const formSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nom requis.')
      .max(100, 'Nom trop long (max 100 caractères).')
      .trim(),
    password: z
      .string()
      .refine(isPasswordValid, {
        message: 'Le mot de passe ne respecte pas toutes les règles.',
      }),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['passwordConfirmation'],
  });

type FormValues = z.infer<typeof formSchema>;

interface AcceptInvitationFormProps {
  token: string;
  /** Appelé après acceptation réussie. Le parent utilise le tempToken pour
   *  monter <TwoFactorSetup>. */
  onSuccess: (result: AcceptInvitationResponse) => void;
}

// ─── Cas d'erreur "terminaux" ────────────────────────────────────────────────
//
// Certaines erreurs (token invalide, expiré, email déjà pris) rendent
// l'invitation définitivement inutilisable — pas la peine de laisser le user
// resubmit. On affiche une bannière plein écran avec un message clair.

interface TerminalError {
  code: 'invalid_token' | 'token_expired' | 'email_already_admin';
  message: string;
}

export function AcceptInvitationForm({
  token,
  onSuccess,
}: AcceptInvitationFormProps) {
  const [terminalError, setTerminalError] = useState<TerminalError | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onBlur',
  });

  // Watch du password pour update la checklist live
  const passwordValue = watch('password') ?? '';
  const passwordConfirmationValue = watch('passwordConfirmation') ?? '';

  // Bouton submit disabled tant que :
  //   - toutes les règles password ne passent pas
  //   - la confirmation ne match pas
  //   - le name est vide
  const canSubmit =
    isPasswordValid(passwordValue) &&
    passwordValue === passwordConfirmationValue &&
    passwordValue.length > 0 &&
    (watch('name') ?? '').trim().length > 0;

  // ─── Submit ───────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const body: AcceptInvitationBody = {
        token,
        name: values.name.trim(),
        password: values.password,
      };
      const res = await apiFetch<AcceptInvitationResponse>(
        '/admin/admins/accept-invitation',
        {
          method: 'POST',
          body,
          skipAuthRetry: true, // pas d'auth admin, pas de sens de refresh
        },
      );
      onSuccess(res);
    } catch (err) {
      if (err instanceof ApiError) {
        // Erreurs terminales → afficher bannière, disable le form
        if (
          err.code === 'invalid_token' ||
          err.code === 'token_expired' ||
          err.code === 'email_already_admin'
        ) {
          setTerminalError({
            code: err.code,
            message: adminErrorMessage(err.code),
          });
          return;
        }
        // Erreurs récupérables → toast, le user peut ressayer
        toast.error(adminErrorMessage(err.code));
      } else {
        toast.error('Erreur inattendue. Réessayez.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render : bannière d'erreur terminale ─────────────────────────────
  if (terminalError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Invitation invalide</AlertTitle>
        <AlertDescription>{terminalError.message}</AlertDescription>
      </Alert>
    );
  }

  // ─── Render : formulaire ──────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="name">Votre nom</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Ex : Alice Martin"
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            className="pr-10"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword
                ? 'Masquer le mot de passe'
                : 'Afficher le mot de passe'
            }
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              rounded p-1 text-muted-foreground
              hover:bg-accent hover:text-foreground
            "
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Checklist live */}
        <PasswordStrengthChecklist password={passwordValue} />
      </div>

      {/* Confirmation mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="passwordConfirmation">
          Confirmer le mot de passe
        </Label>
        <div className="relative">
          <Input
            id="passwordConfirmation"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.passwordConfirmation}
            className="pr-10"
            {...register('passwordConfirmation')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={
              showConfirm
                ? 'Masquer la confirmation'
                : 'Afficher la confirmation'
            }
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              rounded p-1 text-muted-foreground
              hover:bg-accent hover:text-foreground
            "
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.passwordConfirmation && (
          <p className="text-xs text-destructive">
            {errors.passwordConfirmation.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Créer mon compte
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Prochaine étape : configurer l&apos;authentification à deux facteurs
        (obligatoire).
      </p>
    </form>
  );
}