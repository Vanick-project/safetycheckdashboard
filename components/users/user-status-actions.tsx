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
import { useUpdateUserStatus } from '@/hooks/use-admin-users';
import type { UserStatus } from '@/lib/types';
import { ApiError } from '@/lib/types';

interface UserStatusActionsProps {
  userId: string;
  currentStatus: UserStatus;
  userDisplayName: string;
}

type PendingAction = 'suspend' | 'reactivate' | 'delete' | null;

export function UserStatusActions({
  userId,
  currentStatus,
  userDisplayName,
}: UserStatusActionsProps) {
  const router = useRouter();
  const mutation = useUpdateUserStatus();

  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState('');

  const closeDialog = () => {
    setPending(null);
    setReason('');
  };

  const runAction = async () => {
    if (pending === null) return;

    // Reason obligatoire pour DELETE, optionnel pour SUSPEND, N/A pour REACTIVATE
    if (pending === 'delete' && reason.trim().length === 0) {
      toast.error('La raison de la suppression est obligatoire.');
      return;
    }

    const targetStatus: UserStatus =
      pending === 'suspend'
        ? 'PAUSED'
        : pending === 'reactivate'
          ? 'ACTIVE'
          : 'DELETED';

    try {
      await mutation.mutateAsync({
        id: userId,
        body: {
          status: targetStatus,
          ...(reason.trim().length > 0 && { reason: reason.trim() }),
        },
      });

      // Succès — toast + navigation conditionnelle
      if (pending === 'delete') {
        toast.success(`${userDisplayName} a été supprimé.`);
        router.push('/users');
        return; // pas de closeDialog, on quitte la page
      }
      if (pending === 'suspend') {
        toast.success(`${userDisplayName} a été suspendu.`);
      } else {
        toast.success(`${userDisplayName} a été réactivé.`);
      }
      closeDialog();
    } catch (err) {
      // On restera sur la modale ouverte pour laisser l'admin réessayer
      // ou annuler proprement. Le rollback optimiste est géré par le hook.
      const code =
        err instanceof ApiError ? err.code : 'erreur inconnue';
      toast.error(`Impossible d'appliquer l'action (${code}).`);
    }
  };

  const isPending = mutation.isPending;

  return (
    <>
      <div className="flex flex-wrap gap-2">
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
            Cet utilisateur a été supprimé. Aucune action possible via le
            dashboard.
          </p>
        )}
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) closeDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'suspend' && 'Suspendre cet utilisateur ?'}
              {pending === 'reactivate' && 'Réactiver cet utilisateur ?'}
              {pending === 'delete' && 'Supprimer cet utilisateur ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
                {pending === 'suspend' &&
                    'Les check-ins seront mis en pause. L\u2019utilisateur ne recevra plus de rappels et ne pourra plus déclencher d\u2019alertes tant qu\u2019il n\u2019est pas réactivé.'}
                {pending === 'reactivate' &&
                    'Les check-ins reprendront selon la fréquence configurée. L\u2019utilisateur redeviendra visible et actif dans l\u2019app.'}
                {pending === 'delete' && (
                    <>
                    <strong>Action irréversible.</strong> L\u2019utilisateur sera
                    marqué comme supprimé, ses check-ins arrêtés définitivement,
                    et son accès à l\u2019app coupé. Les données historiques sont
                    conservées pour l\u2019audit.
                    </>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pending !== 'reactivate' && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Raison{' '}
                {pending === 'delete' ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground">(optionnel)</span>
                )}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  pending === 'delete'
                    ? 'Ex : demande RGPD, compte frauduleux, doublon…'
                    : 'Ex : compte suspect, en attente de vérification…'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Cette information sera enregistrée dans l\u2019audit log.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // On empêche la fermeture auto de l'AlertDialog pour gérer
                // nous-mêmes la fermeture après le résultat de la mutation.
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