import { Badge } from '@workspace/stillwell-design-system/components/ui/badge';
import { CLINICIAN_PROOF_DESCRIPTION, CLINICIAN_PROOF_LABEL } from '@workspace/recovery-journal/care-team-copy';

/** A persistent notice below navigation, never competing with its layout. */
export function ProofOfConceptBanner() {
  return (
    <aside
      aria-label={CLINICIAN_PROOF_LABEL}
      className="w-full border-t border-border bg-accent text-accent-foreground"
      data-testid="clinician-proof-of-concept"
    >
      <div className="mx-auto flex max-w-[1240px] flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-8 lg:px-12">
        <Badge variant="outline" className="w-fit shrink-0 rounded-full border-current text-accent-foreground">
          {CLINICIAN_PROOF_LABEL}
        </Badge>
        <p className="text-xs leading-5">{CLINICIAN_PROOF_DESCRIPTION}</p>
      </div>
    </aside>
  );
}
