// ─── lib/user-agent-parser.ts ─────────────────────────────────────────────────
// Parser léger de user-agent HTTP.
//
// Détecte browser + OS + type de device en 40 lignes, sans dépendance
// externe. On préfère ça à ua-parser-js (9kb gzipped) parce qu'on n'a
// besoin que des 5 browsers × 6 OS courants pour l'admin dashboard.
//
// Utilisé par :
//   - components/admins/admin-sessions-list.tsx (sessions d'un autre admin)
//   - components/settings/session-item.tsx      (mes propres sessions)
//
// Pour les user-agents exotiques (bots, browsers rares), on retombe sur des
// valeurs neutres — jamais de crash. Le seul objectif est d'aider l'admin
// à reconnaître ses propres devices dans une liste, pas de faire de la
// détection fine.

import { Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ParsedUserAgent {
  Icon: LucideIcon;
  deviceType: 'Desktop' | 'Mobile' | 'Tablette' | 'Inconnu';
  /** Chaîne "Chrome sur macOS", "Safari sur iOS" — prête pour l'UI. */
  summary: string;
  /** Nom du navigateur seul (Chrome, Safari, Firefox…). */
  browser: string;
  /** Nom de l'OS seul (macOS, Windows 10/11, iOS…) ou '' si non détecté. */
  os: string;
}

const FALLBACK: ParsedUserAgent = {
  Icon: Globe,
  deviceType: 'Inconnu',
  summary: 'Client inconnu',
  browser: 'Navigateur',
  os: '',
};

/**
 * Parse un user-agent en composants lisibles. Renvoie toujours un objet
 * valide, jamais null — utilise le FALLBACK si `ua` est null/vide/inconnu.
 */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return FALLBACK;

  // ─── Type de device ──────────────────────────────────────────────────
  // Ordre important : tablette AVANT mobile (iPad matche les deux sinon).
  const isTablet = /iPad|Android.*Tablet|Tablet PC/i.test(ua);
  const isMobile = !isTablet && /iPhone|Android|Windows Phone/i.test(ua);

  const Icon = isTablet ? Tablet : isMobile ? Smartphone : Monitor;
  const deviceType: ParsedUserAgent['deviceType'] = isTablet
    ? 'Tablette'
    : isMobile
      ? 'Mobile'
      : 'Desktop';

  // ─── Browser ────────────────────────────────────────────────────────
  // Ordre important : Edge et Opera contiennent "Chrome" dans leur UA,
  // il faut les tester AVANT Chrome. Safari contient "Version/…/Safari"
  // sur iOS mais aussi sur Chrome iOS (CriOS), donc on teste "CriOS/FxiOS"
  // avant "Safari".
  let browser = 'Navigateur';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera\//.test(ua)) browser = 'Opera';
  else if (/CriOS\//.test(ua)) browser = 'Chrome';
  else if (/FxiOS\//.test(ua)) browser = 'Firefox';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

  // ─── OS ─────────────────────────────────────────────────────────────
  // Ordre important : iOS a "like Mac OS X" dans son UA, il faut tester
  // iPhone/iPad avant "Mac OS X".
  let os = '';
  if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  const summary = os ? `${browser} sur ${os}` : browser;

  return { Icon, deviceType, summary, browser, os };
}