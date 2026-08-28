'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_LABELS } from '@/lib/rbac';
import type { AdminRole } from '@/lib/types';

// ─── Contract ────────────────────────────────────────────────────────────────
//
// Ce composant est purement UI — il ne détient pas de state applied.
// L'input state (search en cours de frappe) est local ici, envoyé au parent
// via onSubmit uniquement. Le pattern double-state est géré par la page
// parent — voir `app/(dashboard)/settings/admins/page.tsx`.
//
// Les filtres role / statut / "afficher supprimés" sont appliqués immédiatement
// (pas d'input state intermédiaire), parce que ce sont des choix discrets
// sans risque de flood du serveur.

export type IsActiveFilter = 'all' | 'active' | 'inactive';

export interface AdminsFiltersState {
  /** Terme de recherche (email OU name). */
  search: string;
  /** Filtre rôle. Undefined = tous les rôles. */
  role: AdminRole | undefined;
  /** all = pas de filtre, active = isActive=true, inactive = isActive=false */
  isActive: IsActiveFilter;
  /** Toggle "Afficher les supprimés" — filtrage client-side sur préfixe email
   *  [DELETED-...]. Faux par défaut pour cacher les tombes. */
  showDeleted: boolean;
}

interface AdminsFiltersProps {
  /** Valeurs input (contrôlées par la page parent). */
  values: AdminsFiltersState;
  /** Mise à jour partielle des filtres. */
  onChange: (next: Partial<AdminsFiltersState>) => void;
  /** Appliquer la recherche (envoie search vers l'état applied). */
  onSubmitSearch: () => void;
  /** Reset complet. */
  onReset: () => void;
}

// ─── Options du select rôle ──────────────────────────────────────────────────
//
// On limite le sélecteur aux 5 rôles platform. Les rôles ORG_* sont
// techniquement supportés par le backend mais pas encore utilisés en prod
// (multi-tenant B2B pas activé). On les ajoutera quand pertinent.

const FILTERABLE_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE',
  'SUPPORT',
  'ANALYST',
];

export function AdminsFilters({
  values,
  onChange,
  onSubmitSearch,
  onReset,
}: AdminsFiltersProps) {
  const hasActiveFilters =
    values.search.trim().length > 0 ||
    values.role !== undefined ||
    values.isActive !== 'all' ||
    values.showDeleted;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* ─── Ligne 1 : recherche ─────────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitSearch();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par email ou nom…"
            value={values.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="default">
          Rechercher
        </Button>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            aria-label="Réinitialiser les filtres"
            title="Réinitialiser les filtres"
          >
            <X className="mr-1 h-4 w-4" />
            Reset
          </Button>
        )}
      </form>

      {/* ─── Ligne 2 : filtres discrets ──────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Rôle */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="role-filter" className="text-xs text-muted-foreground">
            Rôle
          </Label>
          <Select
            value={values.role ?? 'all'}
            onValueChange={(v) =>
              onChange({ role: v === 'all' ? undefined : (v as AdminRole) })
            }
          >
            <SelectTrigger id="role-filter" className="w-[180px]">
              <SelectValue>
                {(value) =>
                  value === 'all' ? 'Tous les rôles' : ROLE_LABELS[value as AdminRole]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {FILTERABLE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Statut actif/inactif */}
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="active-filter"
            className="text-xs text-muted-foreground"
          >
            Activité
          </Label>
          <Select
            value={values.isActive}
            onValueChange={(v) =>
              onChange({ isActive: v as IsActiveFilter })
            }
          >
            <SelectTrigger id="active-filter" className="w-[160px]">
              <SelectValue>
                {(value) =>
                  value === 'all'
                    ? 'Tous'
                    : value === 'active'
                      ? 'Actifs seulement'
                      : 'Inactifs seulement'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs seulement</SelectItem>
              <SelectItem value="inactive">Inactifs seulement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle supprimés */}
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.showDeleted}
            onChange={(e) => onChange({ showDeleted: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span>Afficher les supprimés</span>
        </label>
      </div>
    </div>
  );
}