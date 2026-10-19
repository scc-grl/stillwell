import { useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { PatientRosterLayout } from "./_patientRosterLayout";
import { demoPatients, patientName, type DemoPatient, type PatientStatus } from "./_patientRosterDemo";
import { PatientProgressView } from "./ClinicianPatientProgress";

type PatientFilter = "All" | PatientStatus;

export function ClinicianPatientRoster() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("All");
  const [selectedPatient, setSelectedPatient] = useState<DemoPatient | null>(null);

  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return demoPatients.filter((patient) => {
      const matchesQuery = `${patient.firstName} ${patient.lastName}`.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (filter === "All" || patient.status === filter);
    });
  }, [filter, query]);

  if (selectedPatient) {
    return (
      <PatientProgressView
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  return (
    <PatientRosterLayout>
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your shared-patient workspace</p>
        <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl">Patient journeys</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          A calm place to review what people have chosen to share. Open a patient to compare their starting snapshot with dated check-ins.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 pt-5">
            <p className="text-sm text-muted-foreground">Fictional profiles</p>
            <p className="font-serif text-2xl font-medium">{demoPatients.length} people</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-5">
            <p className="text-sm text-muted-foreground">New to this workspace</p>
            <p className="font-serif text-2xl font-medium">{demoPatients.filter(({ status }) => status === "New").length} people</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-5">
            <p className="text-sm text-muted-foreground">Already in this workspace</p>
            <p className="font-serif text-2xl font-medium">{demoPatients.filter(({ status }) => status === "Existing").length} people</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Names and status are synthetic. Every row opens that fictional person’s own progress preview.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block space-y-2 text-sm font-medium" htmlFor="roster-search">
              Search patients
              <Input
                id="roster-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by first or last name"
              />
            </label>
            <div className="space-y-2">
              <p className="text-sm font-medium">Workspace status</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter patients by workspace status">
                {(["All", "New", "Existing"] as PatientFilter[]).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant={filter === item ? "default" : "outline"}
                    aria-pressed={filter === item}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(7rem,0.7fr)_minmax(10rem,1fr)_auto] gap-4 border-b border-border px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Patient</span>
              <span>Status</span>
              <span>Sharing preview</span>
              <span className="sr-only">Open profile</span>
            </div>
            {visiblePatients.length ? (
              <ul className="space-y-2">
                {visiblePatients.map((patient) => (
                  <li key={patient.id}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-between whitespace-normal text-left sm:grid sm:grid-cols-[minmax(0,1.5fr)_minmax(7rem,0.7fr)_minmax(10rem,1fr)_auto] sm:items-center sm:gap-4"
                      onClick={() => setSelectedPatient(patient)}
                      aria-label={`Open ${patientName(patient)} progress profile, ${patient.status} patient`}
                    >
                      <span className="flex min-w-0 flex-col items-start gap-1">
                        <span className="font-medium text-foreground">{patientName(patient)}</span>
                        <span className="text-xs font-normal text-muted-foreground">{patient.id}</span>
                      </span>
                      <span className="self-start rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground sm:self-auto">
                        {patient.status}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        Patient-selected ratings{patient.sharedReflections ? " and reflections" : ""}
                      </span>
                      <span className="text-sm font-medium text-primary">View progress <span aria-hidden="true">→</span></span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2 rounded-lg bg-muted p-5" role="status">
                <h2 className="text-sm font-semibold">No fictional patients match those filters.</h2>
                <p className="text-sm leading-6 text-muted-foreground">Try another name or show all workspace statuses.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => { setQuery(""); setFilter("All"); }}>
                  Clear search and filters
                </Button>
              </div>
            )}
          </div>
          <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            “New” and “Existing” describe example workspace status only, not an invitation or account state. This preview does not implement access, invitations, or live patient search.
          </p>
        </CardContent>
      </Card>
    </PatientRosterLayout>
  );
}
