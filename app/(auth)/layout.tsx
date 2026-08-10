// ─── app/(auth)/layout.tsx ────────────────────────────────────────────────────
// Layout minimal pour les pages d'auth (login, futurs "forgot password", etc.).
// Centré verticalement, sans sidebar ni chrome dashboard.
//
// Note: (auth) est un route group — il n'apparaît pas dans l'URL. On type
// donc `children` directement avec ReactNode plutôt que via LayoutProps<>,
// qui exigerait un vrai path URL.

import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}