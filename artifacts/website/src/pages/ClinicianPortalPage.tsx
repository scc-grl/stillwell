import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/stillwell-design-system/components/ui/card";
import { Brand } from "@/components/PublicSite";

type ClinicianPortalPageProps = {
  onSignOut: () => void;
};

export default function ClinicianPortalPage({ onSignOut }: ClinicianPortalPageProps) {
  return (
    <main className="stillwell min-h-[100dvh] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <header className="flex w-full items-center justify-between">
          <Brand />
          <Button variant="outline" onClick={onSignOut}>Sign out</Button>
        </header>
        <section className="mt-16 w-full max-w-xl sm:mt-24" aria-labelledby="clinician-portal-title">
          <Card>
            <CardHeader>
              <p className="eyebrow">Stillwell for clinicians</p>
              <CardTitle id="clinician-portal-title" className="display text-3xl font-medium leading-tight">
                Clinician portal — coming soon
              </CardTitle>
              <CardDescription className="text-base leading-7">
                Tools for clinicians are in development.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Clinician accounts are self-identified and not yet verified.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
