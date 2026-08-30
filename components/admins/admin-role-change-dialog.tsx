'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateAdminRole } from '@/hooks/use-admins';
import { adminErrorMessage } from '@/lib/admin-helpers';
import { ROLE_LABELS } from '@/lib/rbac';
import { ApiError } from '@/lib/types';
import type { AdminRole } from '@/lib/types';

// ─── Rôles proposés au changement ────────────────────────────────────────────
// Comme dans le formulaire d'invitation : uniquement les 5 rôles platform.
// ORG_* pas encore activés.
const CHANGEABLE_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE',
  'SUPPORT',
  'ANALYST',
];

interface AdminRoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  adminDisplayName: string;
  currentRole: AdminRole;
}

// ─── Descriptions courtes des rôles (dupliqué depuis invite-admin-modal) ─────
// On duplique volontairement — le contexte de changement de rôle mérite ses
// propres descriptions plus concises, alignées sur le contexte "je promeut
// / rétrograde" plutôt que "je crée un nouveau compte".

const ROLE_SHORT_DESC: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Accès total + gestion des admins.',
  ADMIN: 'Gestion utilisateurs. Lecture des admins.',
  FINANCE: 'Consultation seule (users, audit, dashboard).',
  SUPPORT: 'Peut suspendre/réactiver les utilisateurs.',
  ANALYST: 'Consultation seule. Aucune modification.',
  ORG_OWNER: 'Rôle organisation — non utilisé.',
  ORG_ADMIN: 'Rôle organisation — non utilisé.',
  ORG_VIEWER: 'Rôle organisation — non utilisé.',
};

export function AdminRoleChangeDialog({
  open,
  onOpenChange,
  adminId,
  adminDisplayName,
  currentRole,
}: AdminRoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AdminRole>(currentRole);
  const [reason, setReason] = useState('');
  const mutation = useUpdateAdminRole();

  // Reset le form à chaque ouverture pour éviter que l'ancien reason reste
  useEffect(() => {
    if (open) {
      setSelectedRole(currentRole);
      setReason('');
    }
  }, [open, currentRole]);

  const isPending = mutation.isPending;
  const isSameRole = selectedRole === currentRole;

  const handleSubmit = async (e: React.MouseEvent) => {
    // Empêche la fermeture auto de l'AlertDialog — on gère nous-mêmes selon
    // le résultat de la mutation
    e.preventDefault();

    if (isSameRole) {
      toast.info('Aucun changement — le rôle est identique à l\'actuel.');
      return;
    }

    try {
      await mutation.mutateAsync({
        id: adminId,
        body: {
          role: selectedRole,
          ...(reason.trim().length > 0 && { reason: reason.trim() }),
        },
      });
      toast.success(
        `Rôle mis à jour : ${adminDisplayName} est maintenant ${ROLE_LABELS[selectedRole]}.`,
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(adminErrorMessage(err.code));
      } else {
        toast.error('Erreur inattendue.');
      }
      // On reste sur la modale ouverte pour laisser retenter
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isPending) return; // pas de fermeture pendant l'envoi
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Changer le rôle</AlertDialogTitle>
          <AlertDialogDescription>
            Modifiez le rôle de <strong>{adminDisplayName}</strong>. Cette
            action est enregistrée dans l&apos;audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Rôle actuel (indicatif) */}
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Rôle actuel : </span>
            <span className="font-medium">{ROLE_LABELS[currentRole]}</span>
          </div>

          {/* Sélecteur */}
          <div className="space-y-2">
            <Label htmlFor="role-change-select">Nouveau rôle</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as AdminRole)}
            >
              <SelectTrigger id="role-change-select" disabled={isPending}>
                <SelectValue>
                  {(value) => ROLE_LABELS[value as AdminRole]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CHANGEABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ROLE_SHORT_DESC[selectedRole]}
            </p>
          </div>

          {/* Raison (optionnelle) */}
          <div className="space-y-2">
            <Label htmlFor="role-change-reason">
              Raison{' '}
              <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              id="role-change-reason"
              placeholder="Ex : promotion suite à la revue trimestrielle, changement de fonction, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Cette information sera enregistrée dans l&apos;audit log.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Appliquer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}