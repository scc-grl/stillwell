import { Users } from "lucide-react";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";

export const JOURNAL_SHARING_COPY = "Your journal is private to you. You can choose to share it, read-only, with up to 5 clinicians. Nothing is shared until you invite a clinician or accept their request, and you can stop sharing anytime.";

export default function CareTeamSharingFeature() {
  return (
    <section aria-labelledby="care-team-feature" className="mx-auto max-w-[1240px] px-5 pb-8 sm:px-8 lg:px-12">
      <Card className="flex flex-col gap-4 p-6 shadow-none sm:flex-row sm:items-start sm:p-8">
        <Users className="size-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-2">
          <h2 id="care-team-feature" className="font-serif text-2xl font-medium text-foreground">Share with your care team</h2>
          <p className="text-sm leading-7 text-muted-foreground">Invite a clinician, or accept their request, to let them read your journal. They can't edit it. If you stop sharing, they keep what you shared up to then but see nothing new.</p>
        </div>
      </Card>
    </section>
  );
}
