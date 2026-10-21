import { forwardRef, useEffect, useState, type ReactNode, type Ref } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import {
  useCancelClinicianCareRequest,
  useResendClinicianCareRequest,
  type CareInvite,
  type CarePatient,
} from '@workspace/api-client-react';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card } from '@workspace/stillwell-design-system/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/stillwell-design-system/components/ui/dropdown-menu';
import { careMutationOptions, errorCode, invalidateCare } from './queries';
import { useNotify } from './toast';
import { relativeDay, shortIso } from './format';

const RESEND_COOLDOWN_MS = 10 * 60_000;

/** Re-renders every 30 seconds so the resend countdown stays honest. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();

function SectionTitle({ children, count, id }: { children: ReactNode; count: number; id: string }) {
  return (
    <h2 id={id} className="px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children} · {count}
    </h2>
  );
}

function PatientRow({ patient, selected, detail }: { patient: CarePatient; selected: boolean; detail: string }) {
  return (
    <li>
      <Link
        href={`/clinician/patients/${patient.id}`}
        aria-current={selected ? 'page' : undefined}
        className={`flex min-h-12 flex-col justify-center rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'bg-secondary' : 'hover:bg-muted'}`}
        data-testid={`link-patient-${patient.id}`}
      >
        <span className="text-sm font-semibold text-foreground">{fullName(patient)}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </Link>
    </li>
  );
}

function RequestRow({ request }: { request: CareInvite }) {
  const queryClient = useQueryClient();
  const notify = useNotify();
  const resend = useResendClinicianCareRequest({ mutation: careMutationOptions });
  const cancel = useCancelClinicianCareRequest({ mutation: careMutationOptions });
  const name = fullName(request);
  const now = useNow();
  const lastSent = Date.parse(request.lastResendAt ?? request.sentAt);
  const waitMs = Number.isNaN(lastSent) ? 0 : lastSent + RESEND_COOLDOWN_MS - now;
  const waitMinutes = Math.ceil(waitMs / 60_000);

  const onResend = () => resend.mutate({ id: request.id }, {
    onSuccess: (result) => notify(result.suppressed
      ? 'Request renewed. No email was sent from this environment.'
      : `Request sent to ${result.invite.email}`),
    onError: (error) => {
      const code = errorCode(error);
      notify(code === 'resend_cooldown'
        ? 'You can resend this request 10 minutes after the last one.'
        : code === 'daily_limit'
          ? 'You’ve sent 20 requests today. Try again tomorrow.'
          : 'The request didn’t resend. Check your connection and try again.', 6000);
    },
    onSettled: () => void invalidateCare(queryClient),
  });
  const onCancel = () => cancel.mutate({ id: request.id }, {
    onSuccess: () => notify('Request cancelled'),
    onError: () => notify('The request couldn’t be cancelled. Try again.', 6000),
    onSettled: () => void invalidateCare(queryClient),
  });

  return (
    <li className="flex items-center gap-2 rounded-xl px-3 py-2" data-testid={`row-request-${request.id}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">Waiting · expires {shortIso(request.expiresAt)}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for the request to ${name}`} disabled={resend.isPending || cancel.isPending} data-testid={`button-request-menu-${request.id}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onResend} disabled={waitMs > 0} data-testid={`menu-resend-${request.id}`}>
            {waitMs > 0 ? `Resend available in ${waitMinutes} min` : 'Resend request'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCancel} className="text-destructive" data-testid={`menu-cancel-${request.id}`}>Cancel request</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export const RequestsSection = forwardRef<HTMLElement, { requests: CareInvite[] }>(function RequestsSection({ requests }, ref) {
  return (
    <section ref={ref} tabIndex={-1} aria-labelledby="care-requests-title" className="space-y-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <SectionTitle id="care-requests-title" count={requests.length}>Requests sent</SectionTitle>
      <ul>{requests.map((request) => <RequestRow key={request.id} request={request} />)}</ul>
    </section>
  );
});

export function Sidebar({ active, former, requests, selectedId, onInvite, requestsRef }: {
  active: CarePatient[];
  former: CarePatient[];
  requests: CareInvite[];
  selectedId: string | null;
  onInvite: () => void;
  requestsRef: Ref<HTMLElement>;
}) {
  return (
    <Card className="space-y-6 p-3 shadow-none" data-testid="card-patient-list">
      <nav aria-labelledby="care-active-title" className="space-y-1">
        <SectionTitle id="care-active-title" count={active.length}>Your patients</SectionTitle>
        <ul>
          {active.map((patient) => (
            <PatientRow key={patient.id} patient={patient} selected={patient.id === selectedId}
              detail={patient.lastEntryDate ? `Last entry ${relativeDay(patient.lastEntryDate)}` : 'No entries yet'} />
          ))}
        </ul>
      </nav>
      {requests.length ? <RequestsSection ref={requestsRef} requests={requests} /> : null}
      {former.length ? (
        <nav aria-labelledby="care-former-title" className="space-y-1">
          <SectionTitle id="care-former-title" count={former.length}>Former patients</SectionTitle>
          <ul>
            {former.map((patient) => (
              <PatientRow key={patient.id} patient={patient} selected={patient.id === selectedId}
                detail={patient.disconnectedAt ? `Stopped sharing ${shortIso(patient.disconnectedAt)}` : 'Stopped sharing'} />
            ))}
          </ul>
        </nav>
      ) : null}
      <Button variant="outline" className="w-full" onClick={onInvite} data-testid="button-invite-patient">
        <UserPlus aria-hidden="true" /> Invite a patient
      </Button>
    </Card>
  );
}
