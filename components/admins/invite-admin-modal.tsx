'use client';

import { useEffect } from 'react';
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
import {
  useInviteAdmin,
  useRevokeInvitation,
} from '@/hooks/use-admins';
import { adminErrorMessage } from '@/lib/admin-helpers';
import { ROLE_LABELS } from '@/lib/rbac';
import { ApiError } from '@/lib/types';
import type { AdminRole } from '@/lib/types';
import type {
  InvitationPendingErrorDetails,
  InviteAdminBody,
  InviteAdminResponse,
} from '@/lib/admin-types';

// ─── Rôles proposés à l'invitation ───────────────────────────────────────────
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

// ─── Reason automatique de la révocation ────────────────────────────────────
// Injectée dans l'audit log — permet au SUPER_ADMIN qui audite plus tard de
// distinguer une révocation "correction UX" d'une révocation manuelle.
const REVOKE_REASON = 'Remplacement par nouvelle invitation depuis la modal';

export function InviteAdminModal({
  open,
  onOpenChange,
}: InviteAdminModalProps) {
  const inviteMutation = useInviteAdmin();
  const revokeMutation = useRevokeInvitation();

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
      role: 'SUPPORT',
    },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (!open) reset({ email: '', role: 'SUPPORT' });
  }, [open, reset]);

  // ─── Call unitaire POST /invite ──────────────────────────────────────
  //
  // Extrait dans une fonction réutilisable pour permettre le "retry after
  // revoke". On garde la logique de mapping erreurs dans le caller pour
  // qu'il puisse décider quoi faire du toast (action vs simple message).

  const doInvite = async (
    values: InviteFormValues,
  ): Promise<InviteAdminResponse> => {
    return inviteMutation.mutateAsync({
      email: values.email,
      role: values.role,
      // organizationId : non passé pour les rôles platform
    });
  };

  // ─── Flow principal onSubmit ─────────────────────────────────────────

  const onSubmit = async (values: InviteFormValues) => {
    try {
      const res = await doInvite(values);
      toast.success(
        `Invitation envoyée à ${res.invitation.email}. Elle expire dans 48h.`,
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        // ── Cas spécial : invitation déjà en cours ──
        // On propose une action "Révoquer et réinviter" inline dans le toast.
        if (err.code === 'invitation_pending') {
          const details = err.details as
            | InvitationPendingErrorDetails
            | undefined;
          if (details?.invitationId) {
            showPendingInvitationToast({
              message: adminErrorMessage('invitation_pending', {
                expiresAt: details.expiresAt,
              }),
              invitationId: details.invitationId,
              onRevokeAndReinvite: () =>
                handleRevokeAndReinvite(details.invitationId, values),
            });
            return;
          }
          // Fallback si le backend n'a pas retourné invitationId (rétro-
          // compatibilité au cas où l'ancien format serait servi).
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

  // ─── Flow "Révoquer et réinviter" ────────────────────────────────────
  //
  // Séquence :
  //   1. DELETE l'invitation en cours (avec reason automatique)
  //   2. Selon le résultat du DELETE :
  //      - 200                          → continue vers POST /invite
  //      - 409 invitation_already_revoked → succès silencieux, continue
  //      - 409 invitation_already_consumed → STOP, l'invité a accepté
  //      - 404 invitation_not_found     → STOP, edge case race condition
  //      - autre                        → STOP, toast erreur
  //   3. POST /invite (retry)
  //      - Succès → toast + close modal
  //      - Erreur → toast erreur, modale reste ouverte

  const handleRevokeAndReinvite = async (
    invitationId: string,
    values: InviteFormValues,
  ) => {
    // ── Step 1 : révocation ──
    try {
      await revokeMutation.mutateAsync({
        id: invitationId,
        body: { reason: REVOKE_REASON },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // Traiter "already revoked" comme succès silencieux (idempotent)
        if (err.code === 'invitation_already_revoked') {
          // Ne rien faire, on continue vers le POST /invite
        } else if (err.code === 'invitation_already_consumed') {
          toast.error(adminErrorMessage('invitation_already_consumed'));
          return;
        } else {
          toast.error(adminErrorMessage(err.code));
          return;
        }
      } else {
        toast.error('Erreur inattendue lors de la révocation.');
        return;
      }
    }

    // ── Step 2 : retry POST /invite ──
    try {
      const res = await doInvite(values);
      toast.success(
        `Invitation révoquée et renvoyée à ${res.invitation.email}. Elle expire dans 48h.`,
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(adminErrorMessage(err.code));
      } else {
        toast.error('Erreur inattendue lors du renvoi.');
      }
      // La modale reste ouverte pour laisser retenter
    }
  };

  const isPending = inviteMutation.isPending || revokeMutation.isPending;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
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

// ─── Toast avec action "Révoquer et réinviter" ──────────────────────────────
//
// Extrait dans une fonction dédiée pour clarté du onSubmit. On utilise le
// pattern natif Sonner `action: { label, onClick }` qui rend un bouton
// à droite du toast. Duration 10s = assez pour lire + cliquer sans bloquer
// l'UI indéfiniment.

interface ShowPendingInvitationToastArgs {
  message: string;
  invitationId: string;
  onRevokeAndReinvite: () => void;
}

function showPendingInvitationToast({
  message,
  onRevokeAndReinvite,
}: ShowPendingInvitationToastArgs) {
  toast.error(message, {
    duration: 10_000,
    action: {
      label: 'Révoquer et réinviter',
      onClick: () => onRevokeAndReinvite(),
    },
  });
}

// ─── Descriptions contextuelles des rôles ────────────────────────────────────

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