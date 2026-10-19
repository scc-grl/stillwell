import { Link } from 'wouter';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@workspace/stillwell-design-system/components/ui/card';
import { Footer, PortalHeader } from '@/components/portal-shell';

const privacySections = [
  ['What this portal is for', 'The clinician portal supports clinician account creation and management of a private professional profile. It is separate from patient recovery journals.'],
  ['What you choose to provide', 'Profile information may include your name, professional details, licence information, contact details, areas of work, and private preferences. Phone is optional.'],
  ['How information is used', 'Information is used to maintain your clinician account and profile. Listing and availability preferences are private only and do not publish a directory profile.'],
  ['Patient information', 'Patient journal sharing and patient invitations are not active. This portal does not fetch or display patient journals. Do not enter patient information in your professional profile.'],
  ['Licence information', 'Licence details are informational only and are not verified by Stillwell.'],
  ['Future capabilities', 'Potential sharing, directory, and research experiences are planned and are not available through this portal today.'],
];

const termsSections = [
  ['Account purpose', 'Your account is a private professional account for clinician or practice profile setup. Patient invitations, journal sharing, and directory listings are not active.'],
  ['Accurate professional details', 'You are responsible for the information you choose to add to your profile. Licence information is informational and is not verified by Stillwell.'],
  ['Private preferences', 'Preferences about future directory listing or openness to new patients are private only. They do not publish your profile, create an invitation, or make your contact details available to patients.'],
  ['No patient data', 'Do not enter patient-identifying or patient journal information in your clinician profile. The portal does not connect to patient journals.'],
  ['Planned features', 'Descriptions of future sharing, research, directory, or partnership possibilities are informational only. These capabilities are not currently available.'],
  ['Draft notice', 'This clinician-side notice is a draft provided for account setup. It should be reviewed and finalized by Stillwell before production use.'],
];

export default function NoticesPage({ type }: { type: 'privacy' | 'terms' }) {
  const privacy = type === 'privacy';
  const sections = privacy ? privacySections : termsSections;

  return (
    <div className="min-h-[100dvh] bg-background">
      <PortalHeader />
      <main className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary-foreground hover:text-foreground" data-testid={`link-${type}-back`}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to Stillwell
        </Link>
        <div className="mt-7 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-secondary-foreground">
            {privacy ? <ShieldCheck size={22} aria-hidden="true" /> : <FileText size={22} aria-hidden="true" />}
          </span>
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary-foreground">Clinician portal · Draft</p>
        </div>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-foreground md:text-5xl">
          {privacy ? 'Privacy notice' : 'Terms of use'}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          {privacy
            ? 'A clear overview of this clinician account and the professional profile information you choose to save.'
            : 'The draft terms for a private clinician account and professional profile.'}
        </p>
        <Card className="mt-7 border-border bg-secondary/60 shadow-none">
          <CardContent className="p-5 md:p-6">
            <p className="text-sm leading-6 text-foreground">
              Draft notice — for clinician-side account setup only. These
              notices are not legal advice and require Stillwell review before
              they are finalized.
            </p>
          </CardContent>
        </Card>
        <div className="mt-5 space-y-4">
          {sections.map(([heading, text], index) => (
            <Card key={heading} className="border-border shadow-none">
              <CardContent className="p-6 md:p-7">
                <h2 className="font-serif text-2xl text-foreground">{heading}</h2>
                <p className="mt-3 leading-7 text-muted-foreground" data-testid={`text-${type}-section-${index}`}>
                  {text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
