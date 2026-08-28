'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, UserPlus } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInviteAdmin } from '@/hooks/use-admins';
import { adminErrorMessage } from '@/lib/admin-helpers';
import { ROLE_LABELS } from '@/lib/rbac';
import { ApiError } from '@/lib/types';
import type { AdminRole } from '@/lib/types';
import type { InvitationPendingErrorDetails } from '@/lib/admin-types';

// ─── Rôles proposés à l'invitation ───────────────────────────────────────────
// Comme pour le filtre, on limite aux 5 rôles platform. L'ajout des ORG_*
// viendra avec l'activation du multi-tenant.
const INVITABLE_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE',
  'SUPPORT',
  'ANALYST',
];

// ─── Schema formulaire ───────────────────────────────────────────────────────
const inviteSchema = z.object({
  email: z
    .string()
    .min(1, 'Email requis.')
    .email('Email invalide.')
    .max(255)
    .transform((s) => s.toLowerCase().trim()),
  role: z.enum(INVITABLE_ROLES as [AdminRole, ...AdminRole[]], {
    message: 'Rôle requis.',
  }),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteAdminModal({
  open,
  onOpenChange,
}: InviteAdminModalProps) {
  const mutation = useInviteAdmin();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'SUPPORT', // Défaut prudent : rôle le plus courant, non-privilégié
    },
  });

  const selectedRole = watch('role');

  // Reset le form quand la modale se ferme (mais pas pendant la mutation).
  useEffect(() => {
    if (!open) reset({ email: '', role: 'SUPPORT' });
  }, [open, reset]);

  const onSubmit = async (values: InviteFormValues) => {
    try {
      const res = await mutation.mutateAsync({
        email: values.email,
        role: values.role,
        // organizationId : pas passé pour les rôles platform (backend le
        // refuserait avec role_org_mismatch). Ajouter quand ORG_* actifs.
      });
      toast.success(
        `Invitation envoyée à ${res.invitation.email}. Elle expire dans 48h.`,
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        // Cas spécial invitation_pending : le backend renvoie details.expiresAt
        // pour qu'on puisse afficher la date d'expiration dans le toast.
        if (err.code === 'invitation_pending') {
          const details = err.details as
            | InvitationPendingErrorDetails
            | undefined;
          toast.error(
            adminErrorMessage('invitation_pending', {
              expiresAt: details?.expiresAt,
            }),
          );
          return;
        }
        toast.error(adminErrorMessage(err.code));
      } else {
        toast.error('Erreur inattendue.');
      }
    }
  };

  const isPending = mutation.isPending;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // On empêche la fermeture pendant l'envoi pour éviter les
        // désynchros (le user pourrait re-cliquer et créer 2 invitations).
        if (!next && isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter un admin
          </AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;invité recevra un email avec un lien valable 48 h pour
            créer son compte, choisir son mot de passe et activer sa 2FA.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          id="invite-admin-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="alice@safetycheck.app"
                autoComplete="off"
                disabled={isPending}
                aria-invalid={!!errors.email}
                className="pl-9"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Rôle */}
          <div className="space-y-2">
            <Label htmlFor="invite-role">Rôle</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) =>
                setValue('role', v as AdminRole, { shouldValidate: true })
              }
            >
              <SelectTrigger id="invite-role" disabled={isPending}>
                <SelectValue>
                  {(value) => ROLE_LABELS[value as AdminRole]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-destructive">{errors.role.message}</p>
            )}
            <RoleDescription role={selectedRole} />
          </div>
        </form>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            type="submit"
            form="invite-admin-form"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer l&apos;invitation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Description contextuelle du rôle ────────────────────────────────────────
//
// Aide au choix : un SUPER_ADMIN qui invite en vitesse peut se tromper de
// rôle. Le petit paragraphe explique les capabilities de chaque rôle.

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  SUPER_ADMIN:
    'Accès total, y compris la gestion des autres admins. À réserver aux fondateurs et associés de confiance.',
  ADMIN:
    'Gestion complète des utilisateurs et consultation du dashboard. Peut voir les admins mais pas les modifier.',
  FINANCE:
    'Consultation seule : utilisateurs, audit log, dashboard. Pas de modification.',
  SUPPORT:
    "Peut suspendre / réactiver les utilisateurs. Idéal pour l'équipe support.",
  ANALYST:
    "Consultation seule. Aucune action de modification. Pour l'analyse produit et le reporting.",
  ORG_OWNER: 'Rôle organisation — non utilisé pour le moment.',
  ORG_ADMIN: 'Rôle organisation — non utilisé pour le moment.',
  ORG_VIEWER: 'Rôle organisation — non utilisé pour le moment.',
};

function RoleDescription({ role }: { role: AdminRole }) {
  return (
    <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
  );
}