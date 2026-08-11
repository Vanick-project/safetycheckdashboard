import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { AlertEvent } from '@/lib/types';

interface UserAlertsTimelineProps {
  alerts: AlertEvent[];
}

const REASON_LABELS: Record<AlertEvent['triggerReason'], string> = {
  NO_RESPONSE_AFTER_2_ATTEMPTS: 'Aucune réponse (2 tentatives)',
  NO_RESPONSE_AFTER_3_REMINDERS: 'Aucune réponse (3 rappels)',
  NO_RESPONSE_AFTER_5_REMINDERS: 'Aucune réponse (5 rappels)',
  USER_PRESSED_SOS: 'SOS déclenché',
};

function statusVariant(status: AlertEvent['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'destructive' as const;
    case 'RESOLVED':
      return 'default' as const;
    case 'CANCELLED':
      return 'secondary' as const;
    case 'FAILED':
      return 'outline' as const;
  }
}

export function UserAlertsTimeline({ alerts }: UserAlertsTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Dernières alertes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune alerte déclenchée.
          </p>
        ) : (
          <ol className="space-y-4">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {REASON_LABELS[a.triggerReason]}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      title={formatDateTime(a.triggeredAt)}
                    >
                      Déclenchée {formatRelative(a.triggeredAt)}
                      {a.resolvedAt && (
                        <> · Résolue {formatRelative(a.resolvedAt)}</>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={statusVariant(a.status)}
                    className="font-mono text-xs"
                  >
                    {a.status}
                  </Badge>
                </div>

                {a.actions.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Actions ({a.actions.length})
                    </p>
                    <ul className="space-y-1 text-xs">
                      {a.actions.slice(0, 5).map((act) => (
                        <li
                          key={act.id}
                          className="flex items-center justify-between text-muted-foreground"
                        >
                          <span className="font-mono">
                            {act.actionType}
                            {act.destination && ` → ${act.destination}`}
                          </span>
                          <span className="font-mono">{act.outcome}</span>
                        </li>
                      ))}
                      {a.actions.length > 5 && (
                        <li className="text-muted-foreground italic">
                          + {a.actions.length - 5} autre(s)…
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}