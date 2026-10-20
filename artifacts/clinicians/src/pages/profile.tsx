import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, MapPin } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type {
  ClinicianArea,
  ClinicianPracticeType,
  ClinicianProfileInput,
  ClinicianProfession,
} from '@workspace/api-client-react';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/stillwell-design-system/components/ui/card';
import { Input } from '@workspace/stillwell-design-system/components/ui/input';
import { Textarea } from '@workspace/stillwell-design-system/components/ui/textarea';
import { cn } from '@workspace/stillwell-design-system/lib/utils';
import { useAccountType, useClinicianProfile, useSaveProfile } from '@/hooks/use-clinician-account';
import { useAuth } from '@clerk/react';
import { Footer, PortalHeader } from '@/components/portal-shell';
import { sendPatientToDashboard } from '@/lib/config';

const professions: ClinicianProfession[] = [
  'Physician',
  'Physiotherapist',
  'Psychologist',
  'Occupational therapist',
  'Nurse',
  'Other',
];
const areaOptions: ClinicianArea[] = [
  'Headaches',
  'Dizziness & balance',
  'Return to sport',
  'Vision',
  'Sleep',
  'Concentration & memory',
  'Mood & anxiety',
  'Return to work',
];

type ProfileForm = {
  firstName: string;
  lastName: string;
  practiceType: ClinicianPracticeType;
  profession: ClinicianProfession | '';
  licenseNumber: string;
  licenseRegion: string;
  practiceName: string;
  location: string;
  areas: ClinicianArea[];
  phone: string;
  website: string;
  listInDirectory: boolean;
  openToNewPatients: boolean;
};

const emptyProfile: ProfileForm = {
  firstName: '',
  lastName: '',
  practiceType: 'individual',
  profession: '',
  licenseNumber: '',
  licenseRegion: '',
  practiceName: '',
  location: '',
  areas: [],
  phone: '',
  website: '',
  listInDirectory: false,
  openToNewPatients: false,
};

function Field({
  id,
  label,
  helper,
  children,
}: {
  id: string;
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-5" aria-label="Loading profile" data-testid="status-profile-loading">
      <div className="h-8 w-48 rounded-full bg-secondary" />
      <Card className="border-border shadow-none">
        <CardContent className="space-y-4 p-6">
          <div className="h-5 w-64 rounded-full bg-secondary" />
          <div className="h-11 rounded-xl bg-secondary" />
          <div className="h-11 rounded-xl bg-secondary" />
          <div className="h-24 rounded-xl bg-secondary" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const account = useAccountType(isLoaded && Boolean(isSignedIn));
  const isClinician = isSignedIn && account.data?.accountType === 'clinician';
  const profileQuery = useClinicianProfile(Boolean(isClinician));
  const save = useSaveProfile();
  const initialized = useRef(false);
  const [form, setForm] = useState<ProfileForm>(() => ({
    ...emptyProfile,
    practiceType:
      window.sessionStorage.getItem('stillwell.practiceType') === 'clinic'
        ? 'clinic'
        : 'individual',
  }));
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation('/sign-in');
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    if (account.data?.accountType === 'patient') sendPatientToDashboard();
    if (account.data?.accountType === 'clinician' && !profileQuery.isLoading && !initialized.current) {
      initialized.current = true;
      const profile = profileQuery.data?.profile;
      if (profile) {
        setForm({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          practiceType: profile.practiceType,
          profession: profile.profession ?? '',
          licenseNumber: profile.licenseNumber ?? '',
          licenseRegion: profile.licenseRegion ?? '',
          practiceName: profile.practiceName ?? '',
          location: profile.location ?? '',
          areas: profile.areas ?? [],
          phone: profile.phone ?? '',
          website: profile.website ?? '',
          listInDirectory: profile.listInDirectory ?? false,
          openToNewPatients: profile.openToNewPatients ?? false,
        });
      }
    }
  }, [account.data?.accountType, profileQuery.data, profileQuery.isLoading]);

  const update = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = () => {
    setFormError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError('Please add your first and last name to continue.');
      return;
    }

    const data: ClinicianProfileInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      practiceType: form.practiceType,
      website: form.website.trim() || null,
      phone: form.phone.trim() || null,
      inviteCode: null,
      profession: form.profession || null,
      licenseNumber: form.licenseNumber.trim() || null,
      licenseRegion: form.licenseRegion.trim() || null,
      practiceName: form.practiceName.trim() || null,
      location: form.location.trim() || null,
      areas: form.areas,
      listInDirectory: form.listInDirectory,
      openToNewPatients: form.openToNewPatients,
    };
    save.mutate(
      { data },
      {
        onSuccess: () => {
          window.sessionStorage.removeItem('stillwell.practiceType');
          setLocation('/dashboard');
        },
      },
    );
  };

  if (!isLoaded || (isSignedIn && (account.isLoading || account.data?.accountType === 'clinician' && profileQuery.isLoading))) {
    return <main className="min-h-[100dvh] bg-background px-6 py-12"><ProfileLoading /></main>;
  }

  if (!isSignedIn) return null;
  if (account.isError) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <p role="alert" className="text-destructive" data-testid="status-profile-account-error">We couldn’t confirm your account type.</p>
          <Button className="mt-4" onClick={() => account.refetch()} data-testid="button-profile-retry">Try again</Button>
        </div>
      </main>
    );
  }
  if (account.data?.accountType !== 'clinician') return null;
  if (profileQuery.isError) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <p role="alert" className="text-destructive" data-testid="status-profile-load-error">Your profile could not be loaded.</p>
          <Button className="mt-4" onClick={() => profileQuery.refetch()} data-testid="button-profile-load-retry">Try again</Button>
        </div>
      </main>
    );
  }

  const hasExistingProfile = Boolean(profileQuery.data?.profile);

  return (
    <div className="min-h-[100dvh] bg-background">
      <PortalHeader dashboard={hasExistingProfile} />
      <main className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary-foreground hover:text-foreground" data-testid="link-profile-back">
          <ArrowLeft size={16} aria-hidden="true" /> Dashboard
        </Link>
        <div className="mt-6 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary-foreground">Step 3 of 4 · Professional profile</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground md:text-5xl">
            {hasExistingProfile ? 'Your profile, your way.' : 'A profile that reflects your work.'}
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Add what’s useful to you. First and last name are required; other
            professional details are optional.
          </p>
        </div>

          <form
          className="mt-8 space-y-5"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              saveProfile();
            }}
          data-testid="form-clinician-profile"
        >
          <Card className="border-border shadow-none">
            <CardContent className="p-6 md:p-8">
              <div>
                <h2 className="font-serif text-2xl text-foreground">About you</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Your name is part of your private profile in this portal.</p>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field id="firstName" label="First name *">
                  <Input id="firstName" autoComplete="given-name" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} required data-testid="input-profile-first-name" />
                </Field>
                <Field id="lastName" label="Last name *">
                  <Input id="lastName" autoComplete="family-name" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} required data-testid="input-profile-last-name" />
                </Field>
                <Field id="profession" label="Profession">
                  <select
                    id="profession"
                    value={form.profession}
                    onChange={(event) => update('profession', event.target.value as ClinicianProfession | '')}
                    className="h-12 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="select-profile-profession"
                  >
                    <option value="">Choose a profession (optional)</option>
                    {professions.map((profession) => <option key={profession} value={profession}>{profession}</option>)}
                  </select>
                </Field>
                <Field id="practiceType" label="Practice type">
                  <select
                    id="practiceType"
                    value={form.practiceType}
                    onChange={(event) => update('practiceType', event.target.value as ClinicianPracticeType)}
                    className="h-12 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="select-profile-practice-type"
                  >
                    <option value="individual">Individual clinician</option>
                    <option value="clinic">Clinic or practice</option>
                  </select>
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardContent className="p-6 md:p-8">
              <h2 className="font-serif text-2xl text-foreground">Professional details</h2>
              <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <CircleHelp className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                Licence information is informational only and is not verified by Stillwell.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field id="licenseNumber" label="Licence number">
                  <Input id="licenseNumber" value={form.licenseNumber} onChange={(event) => update('licenseNumber', event.target.value)} data-testid="input-profile-license-number" />
                </Field>
                <Field id="licenseRegion" label="Licence region">
                  <Input id="licenseRegion" value={form.licenseRegion} onChange={(event) => update('licenseRegion', event.target.value)} placeholder="State, province, or territory" data-testid="input-profile-license-region" />
                </Field>
                {form.practiceType === 'clinic' && (
                  <Field id="practiceName" label="Clinic or practice name">
                    <Input id="practiceName" autoComplete="organization" value={form.practiceName} onChange={(event) => update('practiceName', event.target.value)} data-testid="input-profile-practice-name" />
                  </Field>
                )}
                <Field id="location" label="Location" helper="A city or region is enough.">
                  <Textarea id="location" autoComplete="address-level2" maxLength={180} value={form.location} onChange={(event) => update('location', event.target.value)} data-testid="input-profile-location" />
                </Field>
                <Field id="phone" label="Phone (optional)">
                  <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} data-testid="input-profile-phone" />
                </Field>
                <Field id="website" label="Website (optional)">
                  <Input id="website" type="url" autoComplete="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://" data-testid="input-profile-website" />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 text-secondary-foreground" size={20} aria-hidden="true" />
                <div>
                  <h2 className="font-serif text-2xl text-foreground">Areas of work</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose any areas that are relevant to your practice. These are private profile details.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {areaOptions.map((area, index) => {
                  const selected = form.areas.includes(area);
                  return (
                    <Button
                      key={area}
                      type="button"
                      variant="outline"
                      aria-pressed={selected}
                      onClick={() => update('areas', selected ? form.areas.filter((item) => item !== area) : [...form.areas, area])}
                      className={cn('h-auto min-h-12 justify-start whitespace-normal rounded-2xl px-4 py-3 text-left', selected && 'border-primary bg-secondary text-foreground')}
                      data-testid={`checkbox-area-${index}`}
                    >
                      {selected && <Check size={16} aria-hidden="true" />}
                      {area}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {(formError || save.isError) && (
            <p role="alert" className="text-sm text-destructive" data-testid="status-profile-save-error">
              {formError || 'We could not save your profile. Please try again.'}
            </p>
          )}
          {save.isSuccess && (
            <p role="status" className="text-sm font-semibold text-secondary-foreground" data-testid="status-profile-saved">
              Your profile has been saved.
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline" data-testid="button-profile-finish-later">
              <Link href="/dashboard">Finish later</Link>
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={save.isPending} data-testid="button-profile-save-continue">
                {save.isPending ? 'Saving profile…' : 'Save and continue'}
                {!save.isPending && <ArrowRight aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
