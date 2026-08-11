import { Card, CardContent } from '@/components/ui/card';
import { UserPlanBadge } from './user-plan-badge';
import { UserStatusActions } from './user-status-actions';
import { UserStatusBadge } from './user-status-badge';
import { formatDate, formatPhone } from '@/lib/format';
import type { UserDetail } from '@/lib/types';

interface UserDetailHeaderProps {
  user: UserDetail;
}

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
  const displayName = user.firstName ?? 'Sans prénom';

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {displayName}
              </h2>
              <UserStatusBadge status={user.status} />
              <UserPlanBadge plan={user.plan} />
            </div>
            <p className="text-sm text-muted-foreground">
              Créé le {formatDate(user.createdAt)}
            </p>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Téléphone
              </dt>
              <dd className="font-mono">{formatPhone(user.phoneNumber)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </dt>
              <dd>{user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pays / Langue
              </dt>
              <dd>
                {user.country || '—'}{' '}
                <span className="text-muted-foreground">
                  ({user.language})
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Timezone
              </dt>
              <dd>{user.timezone ?? '—'}</dd>
            </div>
            {user.plan === 'BASIC' && user.planExpiresAt && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Abonnement expire le
                </dt>
                <dd>{formatDate(user.planExpiresAt)}</dd>
              </div>
            )}
            {user.organization && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Organisation
                </dt>
                <dd>{user.organization.name}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="lg:min-w-64">
          <UserStatusActions
            userId={user.id}
            currentStatus={user.status}
            userDisplayName={displayName}
          />
        </div>
      </CardContent>
    </Card>
  );
}