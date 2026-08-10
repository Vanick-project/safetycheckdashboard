'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLog } from '@/hooks/use-audit-log';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Couleur du badge selon le type d'action */
function actionVariant(
  action: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('failed') || action.includes('reuse')) return 'destructive';
  if (action.includes('login') || action.includes('refresh')) return 'default';
  if (action.includes('2fa')) return 'secondary';
  return 'outline';
}

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  // On debounce manuellement : on n'appelle le hook qu'avec la valeur
  // appliquée (via Enter ou blur). Sinon, chaque touche = un appel API.
  const [appliedAction, setAppliedAction] = useState('');
  const [appliedEmail, setAppliedEmail] = useState('');

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useAuditLog({
    action: appliedAction || undefined,
    actorEmail: appliedEmail || undefined,
    limit: 25,
  });

  const applyFilters = () => {
    setAppliedAction(actionFilter);
    setAppliedEmail(emailFilter);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyFilters();
  };

  // Flatten toutes les pages en une seule liste
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            {total > 0
              ? `${total} entrée${total > 1 ? 's' : ''} au total`
              : 'Historique des actions admin'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
          />
          Rafraîchir
        </Button>
      </div>

      {/* ─── Filtres ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Filtrer par action (ex: admin.login)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={applyFilters}
          className="w-64"
        />
        <Input
          placeholder="Filtrer par email"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={applyFilters}
          className="w-64"
        />
        <Button variant="secondary" size="default" onClick={applyFilters}>
          Appliquer
        </Button>
      </div>

      {/* ─── Table ────────────────────────────────────────────────────── */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Date</TableHead>
              <TableHead className="w-52">Action</TableHead>
              <TableHead>Acteur</TableHead>
              <TableHead className="hidden lg:table-cell">IP</TableHead>
              <TableHead className="hidden xl:table-cell">Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucune entrée trouvée.
                </TableCell>
              </TableRow>
            )}

            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={actionVariant(item.action)} className="font-mono text-xs">
                    {item.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {item.actorEmail ?? '—'}
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                  {item.ipAddress ?? '—'}
                </TableCell>
                <TableCell className="hidden max-w-xs truncate text-xs text-muted-foreground xl:table-cell">
                  {item.metadata
                    ? JSON.stringify(item.metadata)
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ─── Load more ────────────────────────────────────────────────── */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Charger plus
          </Button>
        </div>
      )}
    </div>
  );
}