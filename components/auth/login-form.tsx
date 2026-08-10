// ─── components/auth/login-form.tsx ───────────────────────────────────────────
// Formulaire email + password. Étape 1 du login.

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/types';
import type { LoginResponse } from '@/lib/types';
import { loginSchema, type LoginInput } from '@/lib/validation';

interface LoginFormProps {
  /** Appelé sur succès du login (step 1). Reçoit la réponse pour que le
   *  parent oriente vers le sous-état 2FA setup ou 2FA verify. */
  onSuccess(response: LoginResponse): void;
}

// Mappage codes d'erreur backend → messages user-friendly
function loginErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect.';
    case 'admin_inactive':
      return 'Ce compte est désactivé. Contacte un super admin.';
    case 'too_many_attempts':
      return 'Trop de tentatives. Réessaie dans 15 minutes.';
    case 'invalid_body':
      return 'Format invalide.';
    default:
      return 'Une erreur est survenue. Réessaie.';
  }
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    setIsSubmitting(true);
    try {
      const response = await login(values.email, values.password);
      onSuccess(response);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown';
      toast.error(loginErrorMessage(code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Se connecter
      </Button>
    </form>
  );
}