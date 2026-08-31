// ─── app/(dashboard)/settings/page.tsx ────────────────────────────────────────
// Préférences personnelles de l'admin connecté.
// Structure : sections empilées. À venir : 2FA (5c.3).
// Note : la gestion des ADMINS (l'annuaire) est sur /settings/admins,
// ce fichier concerne uniquement les préférences de l'admin courant.

import { PasswordChangeCard } from '@/components/settings/password-change-card';
import { SessionsCard } from '@/components/settings/sessions-card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos préférences personnelles et la sécurité de votre compte.
        </p>
      </div>

      <PasswordChangeCard />
      <SessionsCard />

      {/* À venir :
          - <TwoFactorResetCard />  (checkpoint 5c.3) */}
    </div>
  );
}