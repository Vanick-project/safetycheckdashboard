// ─── lib/auth-context.tsx ─────────────────────────────────────────────────────
// State auth global du dashboard.
//
// - Boot: tente POST /admin/auth/refresh au montage (cookie httpOnly).
//   Si succès → user connecté ; sinon → non connecté.
// - Actions login/2fa/logout wrappent les endpoints backend.
// - onSessionEnd (déclenché par api-client quand le refresh échoue mid-session)
//   clear le state et redirige vers /login.

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  apiFetch,
  bootRefresh,
  setAccessToken,
  setOnSessionEnd,
} from './api-client';
import type {
  AdminSummary,
  LoginResponse,
  SessionResponse,
  TwoFactorSetupResponse,
} from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Admin connecté, null si non authentifié */
  admin: AdminSummary | null;
  /** true pendant le refresh silencieux au boot */
  isBooting: boolean;
  /** Raccourci: admin !== null */
  isAuthenticated: boolean;

  /** Step 1 login. Renvoie la réponse backend pour que le caller (page /login)
   *  décide s'il faut router vers setup 2FA ou verify 2FA. */
  login(email: string, password: string): Promise<LoginResponse>;

  /** Génère un secret TOTP + QR code pour le premier enrôlement 2FA. */
  setup2fa(tempToken: string): Promise<TwoFactorSetupResponse>;

  /** Confirme l'enrôlement 2FA avec le premier code TOTP. Set session au succès. */
  enable2fa(tempToken: string, code: string): Promise<void>;

  /** Vérifie un code 2FA pour un admin déjà enrôlé. Set session au succès. */
  verify2fa(tempToken: string, code: string): Promise<void>;

  /** Détruit la session côté backend + local. Redirige vers /login. */
  logout(): Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSummary | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  // Ref pour éviter les closures stales dans onSessionEnd
  const routerRef = useRef(router);
  routerRef.current = router;

  // ─── Boot: tenter restauration session depuis cookie refresh ──────────────
  //
  // useRef empêche le double-mount de React Strict Mode (dev only) de lancer
  // deux appels /refresh simultanés. Le premier refresh rotate le token côté
  // serveur — un second appel avec l'ancien cookie déclencherait le reuse
  // detection et révoquerait toutes les sessions.
  const bootAttempted = useRef(false);

  useEffect(() => {
    if (bootAttempted.current) return;
    bootAttempted.current = true;

    (async () => {
      const session = await bootRefresh();
      if (session) {
        setAdmin(session.admin);
      }
      setIsBooting(false);
    })();
  }, []);

  // ─── Enregistrer le callback session-end (déclenché par api-client) ───────
  useEffect(() => {
    setOnSessionEnd(() => {
      setAdmin(null);
      routerRef.current.push('/login');
    });
    return () => {
      setOnSessionEnd(null);
    };
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    return apiFetch<LoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuthRetry: true, // pas de sens de retry un login sur 401
    });
  }, []);

  const setup2fa = useCallback(async (tempToken: string) => {
    return apiFetch<TwoFactorSetupResponse>('/admin/auth/2fa/setup', {
      method: 'POST',
      body: { tempToken },
      skipAuthRetry: true,
    });
  }, []);

  const enable2fa = useCallback(async (tempToken: string, code: string) => {
    const session = await apiFetch<SessionResponse>('/admin/auth/2fa/enable', {
      method: 'POST',
      body: { tempToken, code },
      skipAuthRetry: true,
    });
    setAccessToken(session.accessToken);
    setAdmin(session.admin);
  }, []);

  const verify2fa = useCallback(async (tempToken: string, code: string) => {
    const session = await apiFetch<SessionResponse>('/admin/auth/2fa/verify', {
      method: 'POST',
      body: { tempToken, code },
      skipAuthRetry: true,
    });
    setAccessToken(session.accessToken);
    setAdmin(session.admin);
  }, []);

  const logout = useCallback(async () => {
    // On appelle le backend pour révoquer la session serveur, mais on nettoie
    // le state local même si le call échoue (offline, backend down, etc.)
    try {
      await apiFetch<{ ok: boolean }>('/admin/auth/logout', {
        method: 'POST',
        skipAuthRetry: true,
      });
    } catch {
      // Best-effort: on clear localement quoi qu'il arrive
    }
    setAccessToken(null);
    setAdmin(null);
    router.push('/login');
  }, [router]);

  const value: AuthContextValue = {
    admin,
    isBooting,
    isAuthenticated: admin !== null,
    login,
    setup2fa,
    enable2fa,
    verify2fa,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}