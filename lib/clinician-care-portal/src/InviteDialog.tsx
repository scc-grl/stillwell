import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateClinicianCareRequest, type CareInvite } from '@workspace/api-client-react';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/stillwell-design-system/components/ui/dialog';
import { Input } from '@workspace/stillwell-design-system/components/ui/input';
import { Label } from '@workspace/stillwell-design-system/components/ui/label';
import { careMutationOptions, errorCode, invalidateCare } from './queries';
import { useNotify } from './toast';
import { shortIso } from './format';

type Field = 'firstName' | 'lastName' | 'email';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_ERRORS: Record<Field, string> = {
  firstName: 'Enter their first name.',
  lastName: 'Enter their last name.',
  email: 'Enter an email like name@example.com.',
};

function validate(field: Field, value: string): string {
  const trimmed = value.trim();
  if (field === 'email') return EMAIL_RE.test(trimmed) && trimmed.length <= 254 ? '' : FIELD_ERRORS.email;
  return trimmed && trimmed.length <= 100 ? '' : FIELD_ERRORS[field];
}

type Outcome = { kind: 'error'; message: string; seeRequests?: boolean } | { kind: 'preview'; email: string; link?: string } | null;

export function InviteDialog({ open, onOpenChange, requests, onSeeRequests }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: CareInvite[];
  onSeeRequests: () => void;
}) {
  const queryClient = useQueryClient();
  const notify = useNotify();
  const create = useCreateClinicianCareRequest({ mutation: careMutationOptions });
  const [values, setValues] = useState<Record<Field, string>>({ firstName: '', lastName: '', email: '' });
  const [errors, setErrors] = useState<Record<Field, string>>({ firstName: '', lastName: '', email: '' });
  const [outcome, setOutcome] = useState<Outcome>(null);
  const first = values.firstName.trim() || 'Your patient';

  function reset() {
    setValues({ firstName: '', lastName: '', email: '' });
    setErrors({ firstName: '', lastName: '', email: '' });
    setOutcome(null);
    create.reset();
  }

  function change(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  const blur = (field: Field) => setErrors((prev) => ({ ...prev, [field]: validate(field, values[field]) }));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (create.isPending) return;
    const next = {
      firstName: validate('firstName', values.firstName),
      lastName: validate('lastName', values.lastName),
      email: validate('email', values.email),
    };
    setErrors(next);
    setOutcome(null);
    const firstInvalid = (Object.keys(next) as Field[]).find((field) => next[field]);
    if (firstInvalid) { document.getElementById(`invite-${firstInvalid}`)?.focus(); return; }
    const data = { firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: values.email.trim() };
    create.mutate({ data }, {
      onSuccess: (result) => {
        void invalidateCare(queryClient);
        if (result.suppressed) {
          // Honest preview: nothing was emailed. The link is shown in development builds only.
          setOutcome({ kind: 'preview', email: data.email, link: import.meta.env.DEV ? result.developmentLink : undefined });
          return;
        }
        change(false);
        notify(`Request sent to ${data.email}`, 4000);
      },
      onError: (error) => {
        const code = errorCode(error);
        const name = data.firstName;
        if (code === 'already_invited') {
          const pending = requests.find((r) => r.status === 'pending' && r.email.toLowerCase() === data.email.toLowerCase());
          setOutcome({
            kind: 'error',
            message: pending
              ? `You’ve already sent ${name} a request. It’s waiting until ${shortIso(pending.expiresAt)}.`
              : `You’ve already sent ${name} a request.`,
            seeRequests: Boolean(pending),
          });
        } else if (code === 'already_connected') {
          setOutcome({ kind: 'error', message: `${name} already shares their journal with you.` });
        } else if (code === 'invalid_email') {
          setErrors((prev) => ({ ...prev, email: FIELD_ERRORS.email }));
        } else if (code === 'first_name_required' || code === 'last_name_required') {
          setErrors((prev) => ({ ...prev, [code === 'first_name_required' ? 'firstName' : 'lastName']: FIELD_ERRORS[code === 'first_name_required' ? 'firstName' : 'lastName'] }));
        } else if (code === 'daily_limit') {
          setOutcome({ kind: 'error', message: 'You’ve sent 20 requests today. Try again tomorrow.' });
        } else {
          setOutcome({ kind: 'error', message: 'The request didn’t send. Check your connection and try again. Nothing was shared.' });
        }
      },
    });
  }

  const field = (id: Field, label: string, type = 'text', autoComplete = 'off') => (
    <div className="space-y-2">
      <Label htmlFor={`invite-${id}`}>{label}</Label>
      <Input
        id={`invite-${id}`}
        type={type}
        autoComplete={autoComplete}
        spellCheck={false}
        value={values[id]}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? `invite-${id}-error` : undefined}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setValues((prev) => ({ ...prev, [id]: value }));
          // Clear a corrected-field error without validating while typing.
          setErrors((prev) => prev[id] ? { ...prev, [id]: '' } : prev);
          if (outcome?.kind === 'error') setOutcome(null);
        }}
        onBlur={() => blur(id)}
        data-testid={`input-invite-${id}`}
      />
      <p id={`invite-${id}-error`} className="min-h-5 text-sm text-destructive" aria-live="polite" aria-atomic="true">{errors[id]}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl" data-testid="dialog-invite-patient">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium">Invite a patient</DialogTitle>
          <DialogDescription>Ask a patient you already see to share their Stillwell journal with you.</DialogDescription>
        </DialogHeader>
        {outcome?.kind === 'preview' ? (
          <div className="space-y-4" data-testid="status-invite-preview">
            <div role="status" className="space-y-2 rounded-xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
              <p className="font-semibold">Request saved. No email was sent.</p>
              <p>Email delivery is turned off in this environment, so {outcome.email} wasn’t contacted.</p>
            </div>
            {outcome.link ? (
              <div className="space-y-2 rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Development link</p>
                <p className="break-all text-sm text-foreground" data-testid="text-dev-link">{outcome.link}</p>
              </div>
            ) : null}
            <DialogFooter>
              <Button onClick={() => change(false)} data-testid="button-invite-done">Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('firstName', 'First name', 'text', 'off')}
              {field('lastName', 'Last name', 'text', 'off')}
            </div>
            {field('email', 'Patient’s email', 'email', 'off')}
            <div className="space-y-2 rounded-xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
              <p className="font-semibold">{first} decides.</p>
              <p>{first} gets an email asking to share their journal with you. Nothing is shared unless {first} agrees, and {first} can stop sharing anytime. You won’t be told if {first} says no.</p>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Only invite people who are your patients. The email includes your name as it appears on your account.</p>
            {outcome?.kind === 'error' ? (
              <div role="alert" className="space-y-2 text-sm text-destructive" data-testid="status-invite-error">
                <p>{outcome.message}</p>
                {outcome.seeRequests ? (
                  <Button type="button" variant="outline" onClick={() => { change(false); onSeeRequests(); }} data-testid="button-see-requests">
                    See your requests
                  </Button>
                ) : null}
              </div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => change(false)} data-testid="button-invite-cancel">Cancel</Button>
              <Button type="submit" disabled={create.isPending} data-testid="button-invite-send">
                {create.isPending ? 'Sending…' : 'Send request'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
