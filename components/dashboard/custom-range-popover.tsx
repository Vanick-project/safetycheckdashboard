'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';

export interface DateRange {
  /** ISO datetime UTC (borne inclusive début : YYYY-MM-DDT00:00:00.000Z) */
  from: string;
  /** ISO datetime UTC (borne inclusive fin : YYYY-MM-DDT23:59:59.999Z) */
  to: string;
}

interface CustomRangePopoverProps {
  /** Range actuellement appliquée (ou null si aucun custom actif). */
  value: DateRange | null;
  /** Appelé quand l'utilisateur clique "Appliquer" avec une range valide. */
  onApply: (range: DateRange) => void;
  /** Optionnel : true quand le mode custom est actif (change le style visuel). */
  isActive?: boolean;
  disabled?: boolean;
}

// ─── Helpers de formatage ────────────────────────────────────────────────────

/** Extrait "YYYY-MM-DD" d'une string ISO. Sûr car la partie date est
 *  invariante en UTC (on a défini les bornes en UTC à la création). */
function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

/** Date d'aujourd'hui au format YYYY-MM-DD en UTC. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Date d'il y a N jours au format YYYY-MM-DD en UTC. */
function daysAgoUtc(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Convertit YYYY-MM-DD + heure UTC → ISO. */
function dateInputToIso(dateStr: string, endOfDay: boolean): string {
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  return new Date(dateStr + suffix).toISOString();
}

/** Formate une ISO UTC en label court fr-FR ("12 juil."). Interprété en UTC
 *  pour matcher la logique métier (on ne veut pas de décalage timezone dans
 *  le label affiché). */
function formatShortLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatRangeLabel(range: DateRange): string {
  return `${formatShortLabel(range.from)} – ${formatShortLabel(range.to)}`;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function CustomRangePopover({
  value,
  onApply,
  isActive = false,
  disabled = false,
}: CustomRangePopoverProps) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Pré-remplissage à l'ouverture ────────────────────────────────────
  // Si une range est déjà appliquée → on la ré-affiche.
  // Sinon → défaut à "30 derniers jours" (aligné avec le preset par défaut).
  useEffect(() => {
    if (!open) return;
    if (value) {
      setFromDate(isoToDateInput(value.from));
      setToDate(isoToDateInput(value.to));
    } else {
      setFromDate(daysAgoUtc(30));
      setToDate(todayUtc());
    }
    setError(null);
  }, [open, value]);

  // ─── Click-outside pour fermer ────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    // mousedown plutôt que click : évite que le click sur le trigger
    // ferme immédiatement le popover qu'on vient d'ouvrir.
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ─── Escape pour fermer ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleApply = () => {
    if (!fromDate || !toDate) {
      setError('Sélectionne les deux dates.');
      return;
    }
    if (fromDate > toDate) {
      setError('La date de début doit être avant la date de fin.');
      return;
    }
    if (toDate > todayUtc()) {
      setError('La date de fin ne peut pas être dans le futur.');
      return;
    }
    onApply({
      from: dateInputToIso(fromDate, false),
      to: dateInputToIso(toDate, true),
    });
    setOpen(false);
  };

  // Label du bouton : si custom actif, on affiche la range formatée.
  const buttonLabel =
    isActive && value ? formatRangeLabel(value) : 'Personnalisée';

  return (
    <div ref={containerRef} className="relative">
      {/* ─── Trigger ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`
          inline-flex items-center gap-2
          rounded-lg border px-3 py-1.5
          text-sm font-medium
          transition-colors
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            isActive
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
          }
        `}
      >
        <Calendar className="h-4 w-4" />
        <span>{buttonLabel}</span>
      </button>

      {/* ─── Popover ─────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Sélection de période personnalisée"
          className="
            absolute right-0 top-full z-50 mt-2
            w-[320px]
            rounded-xl border border-border bg-popover
            p-4 shadow-lg
          "
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Période personnalisée</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Champs de dates */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="range-from"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Du
              </label>
              <input
                id="range-from"
                type="date"
                value={fromDate}
                max={toDate || todayUtc()}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setError(null);
                }}
                className="
                  w-full rounded-md border border-border bg-background
                  px-3 py-2 text-sm
                  focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
                "
              />
            </div>

            <div>
              <label
                htmlFor="range-to"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Au
              </label>
              <input
                id="range-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={todayUtc()}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setError(null);
                }}
                className="
                  w-full rounded-md border border-border bg-background
                  px-3 py-2 text-sm
                  focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
                "
              />
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div
              role="alert"
              className="mt-3 text-xs text-rose-600 dark:text-rose-500"
            >
              {error}
            </div>
          )}

          {/* Note UTC */}
          <p className="mt-3 text-xs text-muted-foreground">
            Dates interprétées en UTC.
          </p>

          {/* Actions */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="
                rounded-md px-3 py-1.5 text-sm font-medium
                text-muted-foreground
                hover:bg-accent hover:text-foreground
              "
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="
                rounded-md bg-primary px-3 py-1.5
                text-sm font-medium text-primary-foreground
                hover:bg-primary/90
              "
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}