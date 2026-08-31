import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPhone } from '@/lib/format';
import type { EmergencyContact } from '@/lib/types';

interface UserEmergencyContactsProps {
  contacts: EmergencyContact[];
}

export function UserEmergencyContacts({
  contacts,
}: UserEmergencyContactsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Contacts d'urgence</span>
          <Badge variant="outline" className="font-mono text-xs">
            {contacts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun contact d'urgence configuré.
          </p>
        ) : (
          <ol className="space-y-3">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {c.priority}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatPhone(c.phoneNumber)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.relationship && (
                    <span className="text-xs text-muted-foreground">
                      {c.relationship}
                    </span>
                  )}
                  {!c.enabled && (
                    <Badge variant="secondary" className="text-xs">
                      Désactivé
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}