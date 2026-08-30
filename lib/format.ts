// ─── lib/format.ts ────────────────────────────────────────────────────────────
// Helpers de formatage réutilisables — dates, téléphones, monnaie, etc.
// Centralisés ici pour éviter la duplication et garantir la cohérence
// entre pages.

/** Formate une date ISO en fr-CA lisible (avec heure). */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formate une date ISO en fr-CA lisible (jour seulement). */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formatage léger d'un numéro international. On garde le +CC et on ajoute
 * des espaces tous les 3-4 chiffres pour la lisibilité. Pas un vrai parser
 * international (libphonenumber-js serait overkill ici).
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length <= 8) return cleaned;
  // Coupe en morceaux de 3-4 en partant de la fin
  const country = cleaned.slice(0, cleaned.length - 10);
  const rest = cleaned.slice(cleaned.length - 10);
  const grouped = rest.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  return country ? `${country} ${grouped}` : grouped;
}

/** Relatif humain type "il y a 3h", "il y a 2 jours". */
export function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'à l\u2019instant';
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 604800) return `il y a ${Math.floor(diffSec / 86400)} j`;
  return formatDate(iso);
}

// ─── Monnaie ──────────────────────────────────────────────────────────────────

/**
 * Formatte un montant USD au format américain standard : "$1,234.56".
 *
 * Utilise en-US (pas fr-CA/fr-FR) volontairement : les métriques revenue
 * du dashboard sont en USD only, et un affichage américain — signe dollar
 * collé, virgules pour les milliers, point décimal — est la convention
 * attendue par les outils financiers (Stripe dashboard, RevenueCat, etc.).
 * On garde 2 décimales même pour les entiers pour la cohérence visuelle
 * ($1,000.00 plutôt que $1,000) — c'est ce qui est standard en compta SaaS.
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}