import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { CheckInEvent } from '@/lib/types';

interface UserCheckinTimelineProps {
  events: CheckInEvent[];
}

function responseBadge(response: 'OK' | 'SOS' | null) {
  if (response === 'OK') {
    return (
      <Badge variant="default" className="gap-1 font-mono text-xs">
        <CheckCircle2 className="h-3 w-3" />
        OK
      </Badge>
    );
  }
  if (response === 'SOS') {
    return (
      <Badge variant="destructive" className="gap-1 font-mono text-xs">
        <XCircle className="h-3 w-3" />
        SOS
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 font-mono text-xs">
      <Clock className="h-3 w-3" />
      Pas de réponse
    </Badge>
  );
}

export function UserCheckinTimeline({ events }: UserCheckinTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Derniers check-ins</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun check-in enregistré.
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 border-b pb-3 last:border-none last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm">
                    Envoyé{' '}
                    <span
                      className="text-muted-foreground"
                      title={formatDateTime(e.sentAt)}
                    >
                      {formatRelative(e.sentAt)}
                    </span>
                    {e.attemptNumber > 1 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (tentative #{e.attemptNumber})
                      </span>
                    )}
                  </p>
                  {e.respondedAt && (
                    <p className="text-xs text-muted-foreground">
                      Réponse : {formatRelative(e.respondedAt)}
                    </p>
                  )}
                </div>
                {responseBadge(e.response)}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}