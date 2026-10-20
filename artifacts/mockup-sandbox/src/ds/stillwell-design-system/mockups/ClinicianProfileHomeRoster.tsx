import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, MapPin } from "lucide-react";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { ClinicianPatientRoster } from "./ClinicianPatientRoster";

const areasOfWork = [
  "Headaches",
  "Dizziness & balance",
  "Return to sport",
  "Vision",
  "Sleep",
  "Concentration & memory",
  "Mood & anxiety",
  "Return to work",
];

type ProfileDraft = {
  firstName: string;
  lastName: string;
  profession: string;
  practiceType: "individual" | "clinic";
  licenseNumber: string;
  licenseRegion: string;
  practiceName: string;
  location: string;
  phone: string;
  website: string;
  areas: string[];
};

const initialProfile: ProfileDraft = {
  firstName: "Avery",
  lastName: "Morgan",
  profession: "Physiotherapist",
  practiceType: "individual",
  licenseNumber: "PT-48271",
  licenseRegion: "Ontario",
  practiceName: "",
  location: "Toronto, Ontario",
  phone: "(416) 555-0148",
  website: "https://averymorgan.example",
  areas: ["Dizziness & balance", "Return to sport", "Concentration & memory"],
};

function ProfileField({
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
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function ProfileView({ onExit }: { onExit: () => void }) {
  const [profile, setProfile] = useState<ProfileDraft>(initialProfile);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const toggleArea = (area: string) => {
    update(
      "areas",
      profile.areas.includes(area)
        ? profile.areas.filter((selected) => selected !== area)
        : [...profile.areas, area],
    );
  };

  const savePreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="border-b border-border bg-secondary">
        <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs font-medium text-secondary-foreground sm:px-6">
          Design preview · fictional clinician profile
        </p>
      </div>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <img src={stillwellMark} alt="" width="36" height="36" className="h-9 w-9" />
            <span className="font-serif text-xl font-semibold tracking-tight text-foreground">stillwell</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">Clinician workspace</span>
          </div>
          <Button type="button" variant="outline" onClick={onExit}>
            Clinician home <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        <Button type="button" variant="ghost" className="px-0" onClick={onExit}>
          <ArrowLeft size={16} aria-hidden="true" /> Exit profile · Clinician home
        </Button>

        <div className="mt-6 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
            Step 3 of 4 · Professional profile
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground md:text-5xl">
            Your profile, your way.
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Add what’s useful to you. First and last name are required; other
            professional details are optional.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={savePreview}>
          <Card className="border-border shadow-none">
            <CardContent className="p-6 md:p-8">
              <div>
                <h2 className="font-serif text-2xl text-foreground">About you</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Your name is part of your private profile in this portal.
                </p>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <ProfileField id="clinician-first-name" label="First name *">
                  <Input
                    id="clinician-first-name"
                    autoComplete="given-name"
                    value={profile.firstName}
                    onChange={(event) => update("firstName", event.target.value)}
                    required
                  />
                </ProfileField>
                <ProfileField id="clinician-last-name" label="Last name *">
                  <Input
                    id="clinician-last-name"
                    autoComplete="family-name"
                    value={profile.lastName}
                    onChange={(event) => update("lastName", event.target.value)}
                    required
                  />
                </ProfileField>
                <ProfileField id="clinician-profession" label="Profession">
                  <Input
                    id="clinician-profession"
                    value={profile.profession}
                    onChange={(event) => update("profession", event.target.value)}
                    placeholder="For example, physiotherapist"
                  />
                </ProfileField>
                <ProfileField id="clinician-practice-type" label="Practice type">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Practice type">
                    {([
                      ["individual", "Individual clinician"],
                      ["clinic", "Clinic or practice"],
                    ] as const).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={profile.practiceType === value ? "default" : "outline"}
                        aria-pressed={profile.practiceType === value}
                        onClick={() => update("practiceType", value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </ProfileField>
                {profile.practiceType === "clinic" ? (
                  <ProfileField id="clinician-practice-name" label="Clinic or practice name">
                    <Input
                      id="clinician-practice-name"
                      autoComplete="organization"
                      value={profile.practiceName}
                      onChange={(event) => update("practiceName", event.target.value)}
                    />
                  </ProfileField>
                ) : null}
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
                <ProfileField id="clinician-license-number" label="Licence number">
                  <Input
                    id="clinician-license-number"
                    value={profile.licenseNumber}
                    onChange={(event) => update("licenseNumber", event.target.value)}
                  />
                </ProfileField>
                <ProfileField id="clinician-license-region" label="Licence region">
                  <Input
                    id="clinician-license-region"
                    value={profile.licenseRegion}
                    onChange={(event) => update("licenseRegion", event.target.value)}
                    placeholder="State, province, or territory"
                  />
                </ProfileField>
                <ProfileField id="clinician-location" label="Location" helper="A city or region is enough.">
                  <Textarea
                    id="clinician-location"
                    autoComplete="address-level2"
                    maxLength={180}
                    value={profile.location}
                    onChange={(event) => update("location", event.target.value)}
                  />
                </ProfileField>
                <ProfileField id="clinician-phone" label="Phone (optional)">
                  <Input
                    id="clinician-phone"
                    type="tel"
                    autoComplete="tel"
                    value={profile.phone}
                    onChange={(event) => update("phone", event.target.value)}
                  />
                </ProfileField>
                <ProfileField id="clinician-website" label="Website (optional)">
                  <Input
                    id="clinician-website"
                    type="url"
                    autoComplete="url"
                    value={profile.website}
                    onChange={(event) => update("website", event.target.value)}
                  />
                </ProfileField>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 text-secondary-foreground" size={20} aria-hidden="true" />
                <div>
                  <h2 className="font-serif text-2xl text-foreground">Areas of work</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Choose any areas that are relevant to your practice. These are private profile details.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {areasOfWork.map((area) => {
                  const selected = profile.areas.includes(area);
                  return (
                    <Button
                      key={area}
                      type="button"
                      variant="outline"
                      aria-pressed={selected}
                      onClick={() => toggleArea(area)}
                      className={`h-auto min-h-12 justify-start whitespace-normal rounded-2xl px-4 py-3 text-left ${
                        selected ? "border-primary bg-secondary text-foreground" : ""
                      }`}
                    >
                      {selected ? <Check size={16} aria-hidden="true" /> : null}
                      {area}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              Changes stay in this local design preview; nothing is sent or saved to an account.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {saved ? (
                <p role="status" className="self-center text-sm font-semibold text-secondary-foreground">
                  Preview changes saved locally.
                </p>
              ) : null}
              <Button type="submit">
                Save preview changes <Check aria-hidden="true" />
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export function ClinicianProfileHomeRoster() {
  const [view, setView] = useState<"profile" | "home">("profile");

  if (view === "profile") {
    return <ProfileView onExit={() => setView("home")} />;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-2 sm:px-6">
          <Button type="button" variant="outline" size="sm" onClick={() => setView("profile")}>
            Your profile
          </Button>
        </div>
      </div>
      <ClinicianPatientRoster />
    </div>
  );
}
