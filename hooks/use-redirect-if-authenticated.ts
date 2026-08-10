// ─── hooks/use-redirect-if-authenticated.ts ───────────────────────────────────
// Miroir inverse d'AuthGuard : à utiliser sur la page /login.
//
// Si le user est déjà connecté, le renvoie vers /dashboard (ou vers ?next=
// s'il est présent et safe). Évite de montrer le formulaire de login à un
// user déjà authentifié qui revient sur /login manuellement.

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const DEFAULT_REDIRECT = '/dashboard';

/**
 * Vérifie que `next` est un chemin relatif safe (pas d'open-redirect vers
 * un autre domaine via `//evil.com` ou `https://evil.com`).
 */
function sanitizeNext(next: string | null): string {
  if (!next) return DEFAULT_REDIRECT;
  // Doit commencer par /, ne pas commencer par // (protocol-relative),
  // et ne pas contenir de schème.
  if (!next.startsWith('/') || next.startsWith('//')) return DEFAULT_REDIRECT;
  if (next.includes(':')) return DEFAULT_REDIRECT;
  return next;
}

export function useRedirectIfAuthenticated() {
  const { isBooting, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isBooting) return;
    if (isAuthenticated) {
      const target = sanitizeNext(searchParams.get('next'));
      router.replace(target);
    }
  }, [isBooting, isAuthenticated, router, searchParams]);

  return { isBooting, isAuthenticated };
}