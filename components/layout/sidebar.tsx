'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCurrentAdmin } from '@/hooks/use-current-admin';
import { cn } from '@/lib/utils';
import type { Capability } from '@/lib/rbac';

// ─── Nav items ───────────────────────────────────────────────────────────────
//
// Chaque item peut déclarer une `capability` requise. Un item sans capability
// est visible à tous les rôles authentifiés.
//
// Actuellement `admins.view` n'a pas de lien dédié — il sera ajouté au
// Checkpoint 5c comme sous-page de /settings ou entrée à part.

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  capability?: Capability;
}

const navItems: readonly NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    capability: 'dashboard.view',
  },
  {
    label: 'Utilisateurs',
    href: '/users',
    icon: Users,
    capability: 'users.view',
  },
  {
    label: 'Audit Log',
    href: '/audit-log',
    icon: ScrollText,
    capability: 'audit-log.view',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    // Pas de capability : /settings contient les préférences perso de
    // l'admin courant (2FA, mot de passe, etc.), visible à tous.
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { hasCapability, isReady } = useCurrentAdmin();

  // Filtrage par rôle. Si pas encore ready, on affiche la sidebar complète
  // au premier render (évite le flash de liens qui disparaissent puis
  // réapparaissent). Le AuthGuard parent bloque de toute façon les routes.
  const visibleItems = navItems.filter(
    (item) => !item.capability || !isReady || hasCapability(item.capability),
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r border-sidebar-border bg-sidebar lg:w-56">
      {/* ─── Brand ──────────────────────────────────────────────────── */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="hidden text-sm font-semibold lg:inline">
          SafetyCheck
        </span>
      </div>

      {/* ─── Navigation ─────────────────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <div className="border-t border-sidebar-border p-2">
        <p className="hidden truncate px-3 py-2 text-xs text-muted-foreground lg:block">
          v0.1.0
        </p>
      </div>
    </aside>
  );
}