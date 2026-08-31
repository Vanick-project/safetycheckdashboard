'use client';

import { use } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAlertsTimeline } from '@/components/users/user-alerts-timeline';
import { UserCheckinTimeline } from '@/components/users/user-checkin-timeline';
import { UserDetailHeader } from '@/components/users/user-detail-header';
import { UserEmergencyContacts } from '@/components/users/user-emergency-contacts';
import { UserSubscriptionHistory } from '@/components/users/user-subscription-history';
import { useAdminUser } from '@/hooks/use-admin-users';
import { ApiError } from '@/lib/types';

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  // Next.js 15+ : params est une Promise. On l'unwrap avec React.use().
  const { id } = use(params);
  const { data: user, isLoading, error } = useAdminUser(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
            href="/users"
            className="-ml-2 inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
        </Link>
        </div>

      {isLoading && <UserDetailSkeleton />}

      {error && !isLoading && <UserDetailError error={error} />}

      {user && !isLoading && (
        <>
          <UserDetailHeader user={user} />

          <div className="grid gap-6 lg:grid-cols-2">
            <UserEmergencyContacts contacts={user.emergencyContacts} />
            <UserCheckinTimeline events={user.checkInEvents} />
          </div>

          <UserAlertsTimeline alerts={user.alertEvents} />

          {/* Section RBAC-gatée en interne — invisible pour ANALYST et rôles org */}
          <UserSubscriptionHistory userId={id} />
        </>
      )}
    </div>
  );
}

// ─── Sub-components (loading + error states) ─────────────────────────────────

function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="mb-6 h-4 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UserDetailError({ error }: { error: unknown }) {
  const code = error instanceof ApiError ? error.code : 'unknown_error';
  const status = error instanceof ApiError ? error.status : null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium">
              {status === 404
                ? 'Utilisateur introuvable.'
                : 'Impossible de charger cet utilisateur.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Code : <span className="font-mono">{code}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}