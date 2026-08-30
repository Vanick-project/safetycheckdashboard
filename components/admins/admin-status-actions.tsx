'use client';

import { useState } from 'react';
import { Ban, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateAdminStatus } from '@/hooks/use-admins';
import { adminErrorMessage } from '@/lib/admin-helpers';
import { ApiError } from '@/lib/types';
import type { AdminStatus } from '@/lib/admin-types';

// ─── Contract ────────────────────────────────────────────────────────────────
//
// Calqué sur user-status-actions.tsx (côté /users) mais avec les spécificités
// des AdminUser :
//   - Auto-protection UI : boutons cachés sur soi-même (Q1 validée)
//   - RBAC : composant supposé wrappé dans <RequireCapability capability="admins.manage">
//   - Mapping erreurs français via adminErrorMessage()
//   - Sur DELETE : navigation vers /settings/admins (comme /users)

interface AdminStatusActionsProps {
  adminId: string;
  currentStatus: AdminStatus;
  adminDisplayName: string;
  /** Callback appelé quand on peut ouvrir la modale de changement de rôle
   *  (délégué au parent qui possède l'état de sa propre modale). */
  onRequestRoleChange: () => void;
}

type PendingAction = 'suspend' | 'reactivate' | 'delete' | null;

export function AdminStatusActions({
  adminId,
  currentStatus,
  adminDisplayName,
  onRequestRoleChange,
}: AdminStatusActionsProps) {
  const router = useRouter();
  const mutation = useUpdateAdminStatus();

  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState('');

  const closeDialog = () => {
    setPending(null);
    setReason('');
  };

  const isPending = mutation.isPending;

  // ─── Action runner ────────────────────────────────────────────────────
  const runAction = async () => {
    if (pending === null) return;

    // Reason obligatoire pour DELETE (Zod backend le refuse sinon)
    if (pending === 'delete' && reason.trim().length === 0) {
      toast.error('La raison de la suppression est obligatoire.');
      return;
    }

    const targetStatus: AdminStatus =
      pending === 'suspend'
        ? 'PAUSED'
        : pending === 'reactivate'
          ? 'ACTIVE'
          : 'DELETED';

    try {
      await mutation.mutateAsync({
        id: adminId,
        body: {
          status: targetStatus,
          ...(reason.trim().length > 0 && { reason: reason.trim() }),
        },
      });

      if (pending === 'delete') {
        toast.success(`${adminDisplayName} a été supprimé.`);
        // On quitte la page detail vers la liste, comme /users
        router.push('/settings/admins');
        return;
      }
      toast.success(
        pending === 'suspend'
          ? `${adminDisplayName} a été suspendu.`
          : `${adminDisplayName} a été réactivé.`,
      );
      closeDialog();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(adminErrorMessage(err.code));
      } else {
        toast.error('Erreur inattendue.');
      }
      // On garde la modale ouverte pour laisser retenter
    }
  };

  return (
    <>
      {/* ─── Boutons d'action ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Actions</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Ces actions modifient l&apos;accès de l&apos;admin au dashboard.
          Chaque changement est enregistré dans l&apos;audit log.
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Changer le rôle */}
          {currentStatus !== 'DELETED' && (
            <Button
              variant="outline"
              onClick={onRequestRoleChange}
              disabled={isPending}
            >
              Changer le rôle
            </Button>
          )}

          {/* Suspend / Reactivate */}
          {currentStatus === 'ACTIVE' && (
            <Button
              variant="outline"
              onClick={() => setPending('suspend')}
              disabled={isPending}
            >
              <Ban className="mr-2 h-4 w-4" />
              Suspendre
            </Button>
          )}
          {currentStatus === 'PAUSED' && (
            <Button
              variant="outline"
              onClick={() => setPending('reactivate')}
              disabled={isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Réactiver
            </Button>
          )}

          {/* Delete */}
          {currentStatus !== 'DELETED' && (
            <Button
              variant="destructive"
              onClick={() => setPending('delete')}
              disabled={isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          )}

          {currentStatus === 'DELETED' && (
            <p className="text-sm text-muted-foreground">
              Cet admin a été supprimé. Aucune action possible via le
              dashboard.
            </p>
          )}
        </div>
      </div>

      {/* ─── AlertDialog de confirmation ────────────────────────────── */}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) closeDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'suspend' && 'Suspendre cet admin ?'}
              {pending === 'reactivate' && 'Réactiver cet admin ?'}
              {pending === 'delete' && 'Supprimer cet admin ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === 'suspend' &&
                `${adminDisplayName} ne pourra plus se connecter au dashboard tant qu'il n'est pas réactivé. Ses sessions actives restent ouvertes jusqu'à leur expiration naturelle.`}
              {pending === 'reactivate' &&
                `${adminDisplayName} pourra de nouveau se connecter au dashboard avec son mot de passe et sa 2FA existante.`}
              {pending === 'delete' && (
                <>
                  <strong>Action irréversible.</strong> {adminDisplayName}{' '}
                  sera marqué comme supprimé, toutes ses sessions actives
                  seront révoquées immédiatement, et son email sera préfixé
                  en base pour libérer la contrainte unique. La restauration
                  via le dashboard n&apos;est pas possible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pending !== 'reactivate' && (
            <div className="space-y-2">
              <Label htmlFor="admin-action-reason">
                Raison{' '}
                {pending === 'delete' ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground">(optionnel)</span>
                )}
              </Label>
              <Textarea
                id="admin-action-reason"
                placeholder={
                  pending === 'delete'
                    ? 'Ex : départ de la société, compte compromis, doublon…'
                    : 'Ex : suspension temporaire pour investigation, en attente de rôle…'
                }
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
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runAction();
              }}
              disabled={isPending}
              className={
                pending === 'delete'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending === 'suspend' && 'Suspendre'}
              {pending === 'reactivate' && 'Réactiver'}
              {pending === 'delete' && 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}