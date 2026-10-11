import { useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";

type DemoPatient = {
  name: string;
  demoId: string;
  status: "Shared in demo" | "Not shared" | "Preview unavailable";
  lastEntry: string;
  sharedSections: string;
  canOpen: boolean;
};

const demoPatients: DemoPatient[] = [
  {
    name: "Taylor Bennett",
    demoId: "DEMO-1042",
    status: "Shared in demo",
    lastEntry: "Feb 12, 2025",
    sharedSections: "Symptoms, routines, reflections",
    canOpen: true,
  },
  {
    name: "Morgan Lee",
    demoId: "DEMO-1058",
    status: "Not shared",
    lastEntry: "—",
    sharedSections: "No data shared",
    canOpen: false,
  },
  {
    name: "Sam Rivera",
    demoId: "DEMO-1092",
    status: "Preview unavailable",
    lastEntry: "—",
    sharedSections: "No sample journey",
    canOpen: false,
  },
];

export function ClinicianPatientDirectory() {
  const [query, setQuery] = useState("");
  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return demoPatients;
    return demoPatients.filter((patient) =>
      `${patient.name} ${patient.demoId}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  function openPatientPortal() {
    window.location.hash = "#/ClinicianJourneyReview";
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/__mockup/images/stillwell-logo.png" alt="Stillwell" className="h-9 w-auto" />
            <span className="text-sm text-muted-foreground">Clinician-review concept · not a live portal</span>
          </div>
          <p className="text-xs text-muted-foreground">All profiles and identifiers are synthetic</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clinician workspace · concept</p>
          <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight">Patient journeys</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Look up a patient and open the journey they have chosen to share. This directory is a static design preview with no account search or patient data connection.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="space-y-1 pt-5">
              <p className="text-sm text-muted-foreground">Profiles in this preview</p>
              <p className="font-serif text-2xl font-medium">3 sample profiles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 pt-5">
              <p className="text-sm text-muted-foreground">Patient-shared journey available</p>
              <p className="font-serif text-2xl font-medium">1 demo profile</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find a patient</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Search the synthetic examples by name or demo ID. Only the profile marked “Shared in demo” opens the journey preview.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block max-w-lg space-y-2 text-sm font-medium" htmlFor="patient-search">
              Search name or demo ID
              <Input
                id="patient-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="For example, Taylor or DEMO-1042"
              />
            </label>

            {visiblePatients.length ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="py-3 pr-4 font-semibold">Patient</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">Sharing</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">Most recent sample entry</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">Shared sections</th>
                      <th scope="col" className="py-3 font-semibold">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePatients.map((patient) => (
                      <tr key={patient.demoId} className="border-b border-border align-top">
                        <th scope="row" className="py-4 pr-4 font-medium">
                          <span className="block">{patient.name}</span>
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">{patient.demoId}</span>
                        </th>
                        <td className="py-4 pr-4">
                          <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{patient.status}</span>
                        </td>
                        <td className="py-4 pr-4 text-muted-foreground">{patient.lastEntry}</td>
                        <td className="py-4 pr-4 text-muted-foreground">{patient.sharedSections}</td>
                        <td className="py-4">
                          {patient.canOpen ? (
                            <Button type="button" size="sm" onClick={openPatientPortal}>Open journey</Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No access in this demo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg bg-muted p-5" role="status">
                <h2 className="text-sm font-semibold">No sample profiles match that search.</h2>
                <p className="text-sm leading-6 text-muted-foreground">Try a different name or demo ID. This preview does not search live patient records.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>Clear search</Button>
              </div>
            )}

            <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              Demo directory only. In a real product, a clinician would see a patient's journal only when it is shared with them; this concept does not implement permission controls or reveal real patient records.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
