import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRemoveFormerCarePatient } from '@workspace/api-client-react';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/stillwell-design-system/components/ui/dialog';
import { careMutationOptions, invalidateCare, removeCare } from './queries';
import { useNotify } from './toast';

export function RemoveFormerButton({ linkId, fullName, firstName, from, to, onRemoved }: {
  linkId: string;
  fullName: string;
  firstName: string;
  from: string;
  to: string;
  onRemoved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const keepRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const notify = useNotify();
  const remove = useRemoveFormerCarePatient({ mutation: careMutationOptions });

  function confirm() {
    setError('');
    remove.mutate({ id: linkId }, {
      onSuccess: () => {
        setOpen(false);
        // The deleted copy must not linger in memory.
        removeCare(queryClient);
        void invalidateCare(queryClient);
        notify('Removed from your list');
        onRemoved();
      },
      onError: () => setError('Your copy couldn’t be removed. Check your connection and try again.'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!remove.isPending) { setOpen(next); setError(''); } }}>
      <Button variant="outline" className="text-destructive" onClick={() => setOpen(true)} data-testid="button-remove-former">
        Remove from my list
      </Button>
      <DialogContent
        className="rounded-2xl"
        onOpenAutoFocus={(event) => { event.preventDefault(); keepRef.current?.focus(); }}
        data-testid="dialog-remove-former"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium">Remove {fullName} from your list?</DialogTitle>
          <DialogDescription className="leading-6">
            This permanently deletes your copy of {firstName}’s journal ({from} – {to}). It can’t be undone. If {firstName} shares again later, you’ll see their journal again from that point.
          </DialogDescription>
        </DialogHeader>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter className="gap-2">
          <Button ref={keepRef} variant="outline" disabled={remove.isPending} onClick={() => setOpen(false)} data-testid="button-keep-former">Keep it</Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={confirm} data-testid="button-confirm-remove">
            {remove.isPending ? 'Removing…' : 'Remove and delete my copy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
