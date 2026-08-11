'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED' | 'DELETED';
export type PlanFilter = 'ALL' | 'FREE' | 'BASIC';

// Labels affichés dans le trigger — Base UI Select.Value ne lit pas
// automatiquement les children des SelectItem (contrairement à Radix),
// donc on mappe explicitement.
const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: 'Tous status',
  ACTIVE: 'Actif',
  PAUSED: 'Suspendu',
  DELETED: 'Supprimé',
};

const PLAN_LABELS: Record<PlanFilter, string> = {
  ALL: 'Tous plans',
  FREE: 'FREE',
  BASIC: 'BASIC',
};

interface UsersFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  plan: PlanFilter;
  onPlanChange: (value: PlanFilter) => void;
  onApply: () => void;
}

export function UsersFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  plan,
  onPlanChange,
  onApply,
}: UsersFiltersProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onApply();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Rechercher (téléphone, email, prénom)"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onApply}
        className="w-72"
      />

      <Select
        value={status}
        onValueChange={(v) => {
          onStatusChange(v as StatusFilter);
          setTimeout(onApply, 0);
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue>
            {(value) => STATUS_LABELS[value as StatusFilter] ?? 'Status'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tous status</SelectItem>
          <SelectItem value="ACTIVE">Actif</SelectItem>
          <SelectItem value="PAUSED">Suspendu</SelectItem>
          <SelectItem value="DELETED">Supprimé</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={plan}
        onValueChange={(v) => {
          onPlanChange(v as PlanFilter);
          setTimeout(onApply, 0);
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {(value) => PLAN_LABELS[value as PlanFilter] ?? 'Plan'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tous plans</SelectItem>
          <SelectItem value="FREE">FREE</SelectItem>
          <SelectItem value="BASIC">BASIC</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="secondary" onClick={onApply}>
        Appliquer
      </Button>
    </div>
  );
}