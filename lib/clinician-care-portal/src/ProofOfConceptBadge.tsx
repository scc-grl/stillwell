import { useEffect, useId, useRef, useState } from 'react';
import { Badge } from '@workspace/stillwell-design-system/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/stillwell-design-system/components/ui/popover';
import { CLINICIAN_PROOF_DESCRIPTION, CLINICIAN_PROOF_LABEL } from '@workspace/recovery-journal/care-team-copy';

/** The badge stays visible; only its explanatory popover can be closed. */
export function ProofOfConceptBadge() {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelClose = () => clearTimeout(timer.current);
  const show = () => { cancelClose(); setOpen(true); };
  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(false), 200);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge asChild variant="secondary" className="min-h-11 shrink-0 cursor-pointer rounded-full border-accent bg-accent px-3 text-accent-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <button
            type="button"
            data-testid="clinician-proof-of-concept"
            aria-describedby={open ? id : undefined}
            onMouseEnter={show}
            onMouseLeave={scheduleClose}
            onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) show(); }}
            onBlur={scheduleClose}
          >{CLINICIAN_PROOF_LABEL}</button>
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        id={id}
        aria-label={CLINICIAN_PROOF_LABEL}
        align="start"
        collisionPadding={16}
        className="max-w-[calc(100vw-2rem)] text-sm leading-6"
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >{CLINICIAN_PROOF_DESCRIPTION}</PopoverContent>
    </Popover>
  );
}
