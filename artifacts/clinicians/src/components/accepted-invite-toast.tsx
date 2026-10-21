import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useUser } from '@clerk/react';
import { getGetMyCarePatientsQueryKey, useGetMyCarePatients } from '@workspace/api-client-react';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { takeAcceptedInvite } from '@/lib/care-link';

/**
 * The receipt (opaque link id + TTL) is consumed at most once per page load and
 * cached in module memory, so StrictMode double renders/effects and the
 * dashboard's loading re-mounts all see the same value. No names are stored.
 */
let receipt: { userId: string; linkId: string | null } | null = null;
function receiptFor(userId: string): string | null {
  if (!receipt) receipt = { userId, linkId: takeAcceptedInvite() };
  return receipt.userId === userId ? receipt.linkId : null;
}
function spendReceipt() {
  if (receipt) receipt = { ...receipt, linkId: null };
}

/** The clinician's own care links (metadata only), shared by the toast and dashboard. */
export function useOwnCarePatients(enabled: boolean) {
  const { isLoaded, user } = useUser();
  return useGetMyCarePatients({
    query: {
      queryKey: [...getGetMyCarePatientsQueryKey(), user?.id ?? 'signed-out'],
      enabled: enabled && isLoaded && Boolean(user?.id),
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
}

/** Active links only: a former link can no longer be read, so it gets no toast. */
/** One-time "You can now read X's journal." after accepting an invite on the website. */
export function AcceptedInviteToast() {
  const { isLoaded, user } = useUser();
  const linkId = isLoaded && user?.id ? receiptFor(user.id) : null;
  const patients = useOwnCarePatients(Boolean(linkId));
  const [dismissed, setDismissed] = useState(false);
  const match = linkId && patients.data
    ? patients.data.active.find((patient) => patient.id === linkId)
    : undefined;
  const message = match && !dismissed ? `You can now read ${match.firstName}’s journal.` : '';

  // The timer starts only once the message is on screen (after data loads).
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => { spendReceipt(); setDismissed(true); }, 15000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const dismiss = () => { spendReceipt(); setDismissed(true); };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end">
      <div role="status" aria-live="polite" aria-atomic="true">
        {message ? (
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-lg" data-testid="toast-invite-accepted">
            <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>{message}</span>
            <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={dismiss} data-testid="button-dismiss-invite-toast">
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
