'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlanBadge } from './user-plan-badge';
import { UserStatusBadge } from './user-status-badge';
import type { User } from '@/lib/types';

interface UsersTableProps {
  items: User[];
  isLoading: boolean;
}

/**
 * Table pure — reçoit les données déjà chargées et le loading state.
 * Aucun appel réseau ici, aucun useState (à part le router de Next).
 * Toute la logique data vit dans /users/page.tsx.
 */
export function UsersTable({ items, isLoading }: UsersTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-56">Utilisateur</TableHead>
            <TableHead className="w-40">Téléphone</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-20">Plan</TableHead>
            <TableHead className="hidden w-20 text-right lg:table-cell">
              Contacts
            </TableHead>
            <TableHead className="hidden w-24 text-right lg:table-cell">
              Check-ins
            </TableHead>
            <TableHead className="hidden w-40 xl:table-cell">
              Dernier check-in
            </TableHead>
            <TableHead className="hidden w-40 xl:table-cell">Créé le</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={`skel-${i}`}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-12" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="ml-auto h-4 w-8" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="ml-auto h-4 w-8" />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
              </TableRow>
            ))}

          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-24 text-center text-muted-foreground"
              >
                Aucun utilisateur trouvé.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            items.map((user) => (
              <TableRow
                key={user.id}
                onClick={() => router.push(`/users/${user.id}`)}
                className="cursor-pointer transition-colors hover:bg-muted/40"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user.firstName ?? '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email ?? 'sans email'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {user.phoneNumber}
                </TableCell>
                <TableCell>
                  <UserStatusBadge status={user.status} />
                </TableCell>
                <TableCell>
                  <UserPlanBadge plan={user.plan} />
                </TableCell>
                <TableCell className="hidden text-right text-sm tabular-nums lg:table-cell">
                  {user._count.emergencyContacts}
                </TableCell>
                <TableCell className="hidden text-right text-sm tabular-nums lg:table-cell">
                  {user._count.checkInEvents}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground xl:table-cell">
                  {formatDate(user.lastCheckInAt)}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground xl:table-cell">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  <ChevronRight className="h-4 w-4" />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}