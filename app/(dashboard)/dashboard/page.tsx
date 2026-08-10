'use client';

import { Activity, Bell, ShieldAlert, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Stats mockées pour la démo — on branchera les vraies données
// via un endpoint dédié plus tard.
const stats = [
  {
    title: 'Utilisateurs actifs',
    value: '1,284',
    change: '+12% ce mois',
    icon: Users,
  },
  {
    title: 'Check-ins aujourd\u2019hui',
    value: '347',
    change: '+8% vs hier',
    icon: Activity,
  },
  {
    title: 'Alertes en cours',
    value: '3',
    change: '2 critiques',
    icon: ShieldAlert,
  },
  {
    title: 'Notifications envoyées',
    value: '892',
    change: 'Dernières 24h',
    icon: Bell,
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de SafetyCheck.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prochaines étapes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Les statistiques ci-dessus sont des données de démonstration.
            On branchera les vraies métriques via un endpoint{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              GET /admin/stats
            </code>{' '}
            dans une prochaine itération.
            La page Audit Log est déjà connectée aux vraies données.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}