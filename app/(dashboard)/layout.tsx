// ─── app/(dashboard)/layout.tsx ───────────────────────────────────────────────
// Layout du groupe des routes protégées.
//
// Rôle :
// 1. AuthGuard bloque le rendu des children tant que isBooting === true.
//    → Fixe la race condition : les useQuery des pages ne se déclenchent
//      QU'APRÈS que bootRefresh ait peuplé accessToken (ou confirmé son absence).
//    → Plus de double 401 initial ni de flash "login page".
// 2. Compose sidebar + header une seule fois pour toutes les pages du groupe.
//
// À NE PAS wrapper AuthGuard/Sidebar/Header à l'intérieur des pages : le layout
// s'en charge. Les pages ne rendent que leur contenu.

import type { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-col pl-16 lg:pl-56">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}