'use client';

import { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAdminStats } from '@/hooks/use-admin-stats';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { SnapshotCard, VolumeCard } from '@/components/dashboard/stat-card';
import { RevenueCards } from '@/components/dashboard/revenue-cards';
import type { DateRange } from '@/components/dashboard/custom-range-popover';
import type {
  StatsPeriodType,
  StatsPreset,
  StatsQueryParams,
} from '@/lib/stats-types';

export default function DashboardPage() {
  // 30d = défaut métier : assez large pour lisser le bruit, assez court pour
  // rester pertinent. Alignement avec les benchmarks internes.
  const [period, setPeriod] = useState<StatsPeriodType>('30d');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);

  // ─── Construction des params du hook ──────────────────────────────────
  // Pour custom, on injecte from/to. Sinon on ne les passe pas (queryKey
  // stable, pas de refetch parasite quand ces champs sont undefined).
  const params: StatsQueryParams =
    period === 'custom' && customRange
      ? { period: 'custom', from: customRange.from, to: customRange.to }
      : { period };

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminStats(params);

  const snapshot = data?.snapshot;
  const volume = data?.volume;
  const revenue = data?.revenue;

  // ─── Handlers PeriodSelector ──────────────────────────────────────────
  // Preset → reset la range custom pour éviter d'y retomber au prochain
  // clic sur "Personnalisée" (qui affichera alors le défaut 30j).
  const handlePresetChange = (preset: StatsPreset) => {
    setPeriod(preset);
    setCustomRange(null);
  };

  const handleCustomApply = (range: DateRange) => {
    setCustomRange(range);
    setPeriod('custom');
  };

  return (
    <div className="space-y-6 p-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-muted-foreground">
            Vue d&apos;ensemble de la plateforme SafetyCheck
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PeriodSelector
            value={period}
            customRange={customRange}
            onChange={handlePresetChange}
            onCustomApply={handleCustomApply}
          />
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Rafraîchir"
            aria-label="Rafraîchir les statistiques"
            className="
              inline-flex items-center gap-2
              rounded-lg border border-border
              px-3 py-1.5 text-sm font-medium
              text-muted-foreground transition-colors
              hover:bg-accent hover:text-foreground
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* ─── Bannière d'erreur ───────────────────────────────────────── */}
      {isError && (
        <div
          role="alert"
          className="
            flex items-start gap-3 rounded-lg border border-rose-200
            bg-rose-50 p-4 text-rose-900
            dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-100
          "
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium">
              Impossible de charger les statistiques
            </div>
            <div className="mt-1 text-sm opacity-90">
              {error instanceof Error ? error.message : 'Erreur inconnue'}
            </div>
          </div>
        </div>
      )}

      {/* ─── Section Snapshot ────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Instantané</h2>
          <span className="text-xs text-muted-foreground">
            État actuel de la plateforme
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SnapshotCard
            label="Utilisateurs actifs"
            value={snapshot?.activeUsers ?? 0}
            hint={
              snapshot
                ? `FREE ${snapshot.planBreakdown.FREE} · BASIC ${snapshot.planBreakdown.BASIC}`
                : undefined
            }
            loading={isLoading}
          />

          <SnapshotCard
            label="Contacts / utilisateur"
            value={
              snapshot ? snapshot.avgContactsPerUser.toFixed(1) : '—'
            }
            hint="Moyenne par compte actif"
            loading={isLoading}
          />

          <SnapshotCard
            label="Alertes actives"
            value={snapshot?.activeAlerts ?? 0}
            hint="Non résolues à cet instant"
            loading={isLoading}
          />

          <SnapshotCard
            label="Résolution 24h"
            value={
              snapshot
                ? snapshot.alertsResolved24h.rate === null
                  ? '—'
                  : `${snapshot.alertsResolved24h.rate.toFixed(1)}%`
                : '—'
            }
            hint={
              snapshot
                ? `${snapshot.alertsResolved24h.resolved} / ${snapshot.alertsResolved24h.total} alertes`
                : undefined
            }
            loading={isLoading}
          />
        </div>
      </section>

      {/* ─── Section Opérations (ex-"Volume sur la période") ─────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Opérations</h2>
          {data?.generatedAt && (
            <span className="text-xs text-muted-foreground">
              Généré à{' '}
              {new Date(data.generatedAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
              {data.cached && ' · cache'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <VolumeCard
            label="Nouveaux utilisateurs"
            value={volume?.newUsers.value ?? 0}
            delta={volume?.newUsers.delta ?? null}
            loading={isLoading}
          />
          <VolumeCard
            label="Check-ins"
            value={volume?.checkIns.value ?? 0}
            delta={volume?.checkIns.delta ?? null}
            loading={isLoading}
          />
          <VolumeCard
            label="Notifications"
            value={volume?.notifications.value ?? 0}
            delta={volume?.notifications.delta ?? null}
            loading={isLoading}
          />
          <VolumeCard
            label="Alertes déclenchées"
            value={volume?.alertsTriggered.value ?? 0}
            delta={volume?.alertsTriggered.delta ?? null}
            loading={isLoading}
          />
        </div>
      </section>

      {/* ─── Section Revenus ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Revenus</h2>
          <span className="text-xs text-muted-foreground">
            Montants en USD
          </span>
        </div>

        <RevenueCards revenue={revenue} loading={isLoading} />
      </section>
    </div>
  );
}