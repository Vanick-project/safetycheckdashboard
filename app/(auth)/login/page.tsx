// ─── app/(auth)/login/page.tsx ────────────────────────────────────────────────
// Page /login — orchestre la state machine locale du flow d'auth.
//
// Suspense obligatoire autour du contenu qui utilise useSearchParams (via le
// hook useRedirectIfAuthenticated) — sinon Next.js râle au build.

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { TwoFactorVerify } from '@/components/auth/two-factor-verify';
import { useRedirectIfAuthenticated } from '@/hooks/use-redirect-if-authenticated';
import type { LoginResponse } from '@/lib/types';

type Step =
  | { kind: 'password' }
  | { kind: '2fa-setup'; tempToken: string }
  | { kind: '2fa-verify'; tempToken: string };

function LoginPageContent() {
  const { isBooting, isAuthenticated } = useRedirectIfAuthenticated();
  const [step, setStep] = useState<Step>({ kind: 'password' });

  // Pendant le boot du context ou si on est déjà auth, le hook redirige.
  // On évite juste de flasher le form entre-temps.
  if (isBooting || isAuthenticated) {
    return null;
  }

  const handleLoginSuccess = (response: LoginResponse) => {
    if ('requires2faSetup' in response) {
      setStep({ kind: '2fa-setup', tempToken: response.tempToken });
    } else {
      setStep({ kind: '2fa-verify', tempToken: response.tempToken });
    }
  };

  const backToPassword = () => setStep({ kind: 'password' });

  // Le succès final (2FA verify ou enable) est déjà géré par le context
  // (setAdmin). Le hook useRedirectIfAuthenticated dispatch alors le push
  // vers /dashboard (ou ?next=). On n'a rien à faire ici de plus.
  const noopSuccess = () => {
    // Force un re-render — useRedirectIfAuthenticated verra isAuthenticated=true
  };

  return (
    <Card>
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">SafetyCheck Admin</CardTitle>
        <CardDescription>
          {step.kind === 'password'
            ? 'Connecte-toi à la console d\u2019administration'
            : 'Vérification de sécurité'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {step.kind === 'password' && (
          <LoginForm onSuccess={handleLoginSuccess} />
        )}
        {step.kind === '2fa-setup' && (
          <TwoFactorSetup
            tempToken={step.tempToken}
            onSuccess={noopSuccess}
            onCancel={backToPassword}
          />
        )}
        {step.kind === '2fa-verify' && (
          <TwoFactorVerify
            tempToken={step.tempToken}
            onSuccess={noopSuccess}
            onCancel={backToPassword}
          />
        )}

        {step.kind === 'password' && (
          <p className="pt-4 text-center text-xs text-muted-foreground">
            Accès réservé aux administrateurs SafetyCheck.
            {' '}
            <Link href="/" className="underline underline-offset-2">
              Retour
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}