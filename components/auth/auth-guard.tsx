// ─── components/auth/auth-guard.tsx ───────────────────────────────────────────
// Wrapper client pour les routes protégées.
//
// - Pendant le boot refresh → spinner (évite le flash "login page")
// - Non authentifié → redirect vers /login avec `?next=<current path>`
// - Authentifié → render children
//
// À placer autour des layouts/pages qui exigent une session (dashboard, etc.)

'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isBooting, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isBooting) return;
    if (!isAuthenticated) {
      // Préserve la destination initiale pour redirection post-login.
      const next = pathname ? encodeURIComponent(pathname) : '';
      router.replace(next ? `/login?next=${next}` : '/login');
    }
  }, [isBooting, isAuthenticated, pathname, router]);

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // L'effet dispatche le redirect. On renvoie null pour éviter le flash
    // de contenu protégé pendant le tick où le router change de route.
    return null;
  }

  return <>{children}</>;
}