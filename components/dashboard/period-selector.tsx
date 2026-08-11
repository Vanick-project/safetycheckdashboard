'use client';

import type { StatsPeriodType, StatsPreset } from '@/lib/stats-types';
import {
  CustomRangePopover,
  type DateRange,
} from './custom-range-popover';

interface PeriodSelectorProps {
  value: StatsPeriodType;
  /** Range custom actuellement appliquée (ou null). */
  customRange: DateRange | null;
  /** Appelé quand un preset est sélectionné. */
  onChange: (value: StatsPreset) => void;
  /** Appelé quand une range custom est appliquée depuis le popover. */
  onCustomApply: (range: DateRange) => void;
  disabled?: boolean;
}

const PRESETS: { value: StatsPreset; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
];

export function PeriodSelector({
  value,
  customRange,
  onChange,
  onCustomApply,
  disabled = false,
}: PeriodSelectorProps) {
  const isCustomActive = value === 'custom';

  return (
    <div className="flex items-center gap-2">
      {/* Segmented control — presets */}
      <div
        role="tablist"
        aria-label="Période"
        className="inline-flex items-center rounded-lg border border-border bg-background p-1"
      >
        {PRESETS.map((preset) => {
          const isActive = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={disabled}
              onClick={() => onChange(preset.value)}
              className={`
                rounded-md px-3 py-1.5 text-sm font-medium
                transition-colors
                disabled:cursor-not-allowed disabled:opacity-50
                ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }
              `}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Popover pour la période personnalisée */}
      <CustomRangePopover
        value={customRange}
        onApply={onCustomApply}
        isActive={isCustomActive}
        disabled={disabled}
      />
    </div>
  );
}