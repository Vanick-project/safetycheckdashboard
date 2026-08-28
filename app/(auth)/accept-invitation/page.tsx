'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { ROLE_LABELS } from '@/lib/rbac';
import type { AcceptInvitationResponse } from '@/lib/admin-types';

// ─── Structure de la page ────────────────────────────────────────────────────
//
// Cette page est publique (dans le route group (auth), pas de AuthGuard).
// Elle lit le token dans le query string ?token=... et gère un flow en 2 steps :
//
//   Step 1 (password)  : formulaire name + password → POST accept-invitation
//                        → reçoit tempToken 5min
//   Step 2 (2fa)       : monte <TwoFactorSetup tempToken={...}> inline
//                        → à la fin, enable2fa met à jour l'AuthContext
//                        → onSuccess route vers /dashboard
//
// Pas de sessionStorage, pas de nouvelle route, pas de tempToken en URL.
// Le tempToken reste en state React local → jamais persisté.
//
// Note Suspense : useSearchParams déclenche un warning "should be wrapped in
// Suspense boundary" en Next 15+. On wrap le contenu dans <Suspense>.

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInvitationPageContent />
    </Suspense>
  );
}

// ─── Contenu (Suspended) ─────────────────────────────────────────────────────

type Step =
  | { kind: 'password' }
  | { kind: '2fa'; tempToken: string; adminName: string; adminRole: string };

function AcceptInvitationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<Step>({ kind: 'password' });

  // ─── Token manquant : bannière d'erreur ───────────────────────────────
  if (!token || token.trim().length === 0) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertTitle>Lien invalide</AlertTitle>
          <AlertDescription>
            Ce lien d&apos;invitation est incomplet. Vérifiez que vous avez
            bien collé l&apos;URL entière depuis votre email.
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  // ─── Handlers de transition ───────────────────────────────────────────
  const handlePasswordSuccess = (result: AcceptInvitationResponse) => {
    // Le backend a créé l'AdminUser + renvoyé un tempToken 2fa_setup (5min).
    // On passe au step 2 avec ce token — le TwoFactorSetup existant prend
    // le relais.
    setStep({
      kind: '2fa',
      tempToken: result.tempToken,
      adminName: result.admin.name,
      adminRole: result.admin.role,
    });
    toast.success(
      "Compte créé. Configurez l'authentification à deux facteurs pour finaliser.",
    );
  };

  const handleTwoFactorSuccess = () => {
    // À ce stade, enable2fa a set l'accessToken + l'admin dans l'AuthContext.
    // On route vers /dashboard — l'AuthGuard verra l'admin comme authentifié.
    toast.success('Bienvenue ! Votre compte est prêt.');
    router.push('/dashboard');
  };

  const handleTwoFactorCancel = () => {
    // Cas rare : le user annule le 2fa setup après avoir créé son compte.
    // Le tempToken expire dans 5 min, mais l'AdminUser existe déjà. Il
    // devra passer par le login normal + un flow spécifique pour finaliser
    // sa 2FA (non implémenté pour l'instant — on route vers /login).
    toast.info(
      'Configuration 2FA annulée. Vous pouvez vous connecter et la configurer plus tard.',
    );
    router.push('/login');
  };

  // ─── Render selon le step ─────────────────────────────────────────────
  if (step.kind === '2fa') {
    return (
      <PageShell
        title="Configurer votre 2FA"
        subtitle={`Bienvenue ${step.adminName} — rôle ${
          ROLE_LABELS[step.adminRole as keyof typeof ROLE_LABELS] ??
          step.adminRole
        }. Cette étape est obligatoire pour sécuriser votre compte admin.`}
      >
        <TwoFactorSetup
          tempToken={step.tempToken}
          onSuccess={handleTwoFactorSuccess}
          onCancel={handleTwoFactorCancel}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Bienvenue sur SafetyCheck Admin"
      subtitle="Créez votre compte pour accéder à la console d'administration."
    >
      <AcceptInvitationForm
        token={token}
        onSuccess={handlePasswordSuccess}
      />
    </PageShell>
  );
}

// ─── Shell de page ───────────────────────────────────────────────────────────
//
// Layout centré, card sur fond neutre. Cohérent avec le login existant.
// On ne peut pas réutiliser le layout de (auth)/layout.tsx tel quel s'il
// est trop générique, mais on suit visuellement le même pattern.

function PageShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">SafetyCheck</span>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {(title || subtitle) && (
            <div className="mb-6 space-y-2">
              {title && (
                <h1 className="text-xl font-semibold tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Loading fallback pour Suspense ──────────────────────────────────────────

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}