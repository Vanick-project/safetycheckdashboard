// ─── lib/api-client.ts ────────────────────────────────────────────────────────
// Wrapper fetch typé pour l'API admin SafetyCheck.
//
// Modèle de sécurité :
// - Access token = mémoire only (variable module-scoped).
//   Pas de localStorage/sessionStorage → immunisé aux fuites XSS.
// - Refresh token = cookie httpOnly posé par le backend sur /admin/auth.
//   On l'active avec `credentials: 'include'`.
// - Sur 401, on tente 1 refresh transparent. Les 401 concurrents partagent
//   la même promesse (pas de rafale sur /refresh).
// - Si le refresh échoue, on vide le token en mémoire et on déclenche
//   `onSessionEnd` → l'AuthProvider redirige vers /login.

import {
  ApiError,
  type ApiErrorBody,
  type SessionResponse,
} from './types';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local.',
  );
}

// ─── État en mémoire ──────────────────────────────────────────────────────────

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let onSessionEndCallback: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Enregistre un callback appelé quand le refresh échoue définitivement
 * (l'utilisateur doit se reconnecter). L'AuthProvider s'y branche au mount.
 */
export function setOnSessionEnd(cb: (() => void) | null): void {
  onSessionEndCallback = cb;
}

// ─── Coordination du refresh ──────────────────────────────────────────────────

/**
 * POST /admin/auth/refresh (utilise le cookie). Retourne le nouveau access
 * token ou throw. Un seul refresh in-flight à la fois — les appelants
 * concurrents attendent la même promesse.
 */
function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const p = (async () => {
    const res = await fetch(`${API_URL}/admin/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      accessToken = null;
      const body = (await safeParseJson(res)) as ApiErrorBody | null;
      const code = body?.error ?? 'refresh_failed';
      onSessionEndCallback?.();
      throw new ApiError(res.status, code);
    }

    const data = (await res.json()) as SessionResponse;
    accessToken = data.accessToken;
    return data.accessToken;
  })();

  refreshPromise = p;
  // Vide la promesse à la fin quel que soit le résultat, pour permettre
  // au prochain 401 d'en lancer une nouvelle.
  p.finally(() => {
    if (refreshPromise === p) refreshPromise = null;
  });

  return p;
}

/**
 * Appelé par l'AuthProvider au montage pour tenter de restaurer une session
 * depuis le cookie. Retourne la session ou null si pas de session valide.
 */
export async function bootRefresh(): Promise<SessionResponse | null> {
  try {
    const res = await fetch(`${API_URL}/admin/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      accessToken = null;
      return null;
    }
    const data = (await res.json()) as SessionResponse;
    accessToken = data.accessToken;
    return data;
  } catch {
    accessToken = null;
    return null;
  }
}

// ─── Wrapper fetch principal ──────────────────────────────────────────────────

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Désactive le retry-after-refresh sur 401. Utilisé par les endpoints
   *  auth qui n'ont pas de sens à retry. */
  skipAuthRetry?: boolean;
}

/**
 * Fetch typé.
 *
 *   const { admin } = await apiFetch<{ admin: AdminMe }>('/admin/me');
 *
 * - `path` commence par `/`, préfixé par NEXT_PUBLIC_API_URL.
 * - `body` est n'importe quel JSON-serializable.
 * - Attache `Authorization: Bearer <token>` si on en a un.
 * - `credentials: 'include'` pour le cookie de refresh cross-origin.
 * - Sur 401 → refresh + retry (une seule fois).
 * - Throw `ApiError` sur toute réponse non-2xx.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, skipAuthRetry, ...init } = options;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(headers as Record<string, string> | undefined),
    };
    if (accessToken) {
      finalHeaders.Authorization = `Bearer ${accessToken}`;
    }

    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: finalHeaders,
      credentials: 'include',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  };

  let res = await doFetch();

  // ─── Refresh auto sur 401 ──────────────────────────────────────────────
  if (res.status === 401 && !skipAuthRetry && accessToken) {
    try {
      await refreshAccessToken();
      res = await doFetch();
    } catch {
      // refreshAccessToken a déjà appelé onSessionEnd
      const body401 = (await safeParseJson(res)) as ApiErrorBody | null;
      throw new ApiError(
        401,
        body401?.error ?? 'unauthorized',
        body401?.details,
      );
    }
  }

  if (!res.ok) {
    const errBody = (await safeParseJson(res)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      errBody?.error ?? `http_${res.status}`,
      errBody?.details,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeParseJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}