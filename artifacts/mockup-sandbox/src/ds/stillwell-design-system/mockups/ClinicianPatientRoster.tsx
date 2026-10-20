import { useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { PatientRosterLayout } from "./_patientRosterLayout";
import { demoPatients, formatDemoDate, patientName, symptoms, type DemoPatient, type PatientStatus } from "./_patientRosterDemo";

type PatientFilter = "All" | PatientStatus;

const symptomLineColors = [
  "hsl(var(--primary))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--secondary-foreground))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--foreground))",
];

function chartValue(rating: number | undefined) {
  if (rating === undefined) return 0;
  return [1, 2, 3, 5][rating] ?? 0;
}

function ratingDisplay(rating: number | undefined) {
  if (rating === undefined) return "0 / 5 · Not supplied";
  const labels = ["Not noticeable", "Less noticeable", "Noticeable", "More noticeable"];
  return `${chartValue(rating)} / 5 · ${labels[rating] ?? "Not supplied"}`;
}

function PatientProgressChart({ patient, onBack }: { patient: DemoPatient; onBack: () => void }) {
  const entries = [
    { date: patient.baselineDate, ratings: patient.baseline },
    ...patient.checkIns,
  ];
  const chart = { width: 760, height: 290, left: 48, right: 744, top: 20, bottom: 224 };
  const x = (index: number) => entries.length === 1
    ? (chart.left + chart.right) / 2
    : chart.left + (index / (entries.length - 1)) * (chart.right - chart.left);
  const y = (value: number) => chart.bottom - (value / 5) * (chart.bottom - chart.top);

  return (
    <PatientRosterLayout onBack={onBack}>
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient-reported journey · fictional profile</p>
            <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl">{patientName(patient)}</h1>
            <p className="text-sm text-muted-foreground">{patient.id} · {patient.status} in this demo workspace</p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Patient-selected sharing · simulated</span>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Symptom progress over time</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            A visual view of the patient’s reported ratings from their starting snapshot through each supplied check-in.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-x-auto">
            <svg
              className="h-auto min-w-[38rem] w-full"
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              role="img"
              aria-label={`Symptom rating progress chart for ${patientName(patient)}. Ratings range from zero for not supplied to five for more noticeable.`}
            >
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <g key={value}>
                  <line x1={chart.left} x2={chart.right} y1={y(value)} y2={y(value)} stroke="hsl(var(--border))" strokeDasharray={value === 0 ? undefined : "3 5"} />
                  <text x={chart.left - 14} y={y(value) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="12">{value}</text>
                </g>
              ))}
              {entries.map((entry, index) => (
                <g key={entry.date}>
                  <line x1={x(index)} x2={x(index)} y1={chart.bottom} y2={chart.bottom + 5} stroke="hsl(var(--border))" />
                  <text x={x(index)} y={chart.bottom + 24} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">
                    {index === 0 ? "Start" : formatDemoDate(entry.date).replace(/, \d{4}$/, "")}
                  </text>
                </g>
              ))}
              {symptoms.map(({ key }, seriesIndex) => {
                const values = entries.map((entry) => chartValue(entry.ratings[key]));
                const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
                return (
                  <g key={key}>
                    <polyline points={points} fill="none" stroke={symptomLineColors[seriesIndex]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    {values.map((value, index) => (
                      <circle key={`${key}-${entries[index].date}`} cx={x(index)} cy={y(value)} r="4" fill="hsl(var(--card))" stroke={symptomLineColors[seriesIndex]} strokeWidth="2.5">
                        <title>{`${symptoms.find((symptom) => symptom.key === key)?.label}: ${entries[index].ratings[key] === undefined ? "Not supplied, charted as 0" : `${value} of 5`} · ${formatDemoDate(entries[index].date)}`}</title>
                      </circle>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chart symptom legend">
            {symptoms.map(({ key, label }, index) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: symptomLineColors[index] }} aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-2 rounded-lg bg-muted p-4 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
            <p><strong className="text-foreground">Rating key:</strong> Not noticeable 1 · Less noticeable 2 · Noticeable 3 · More noticeable 5</p>
            <p><strong className="text-foreground">Not supplied:</strong> charted as 0, representing a symptom not yet reported.</p>
          </div>
          <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            These are fictional example entries. The chart shows reported values over time; it does not explain what caused a change or provide a diagnosis.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reported ratings</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">Starting snapshot compared with the latest supplied check-in.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-3 pr-4 font-semibold">Symptom</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Starting · {formatDemoDate(patient.baselineDate)}</th>
                <th scope="col" className="py-3 font-semibold">Latest · {patient.checkIns.length ? formatDemoDate(patient.checkIns[patient.checkIns.length - 1].date) : "—"}</th>
              </tr>
            </thead>
            <tbody>
              {symptoms.map(({ key, label }) => {
                const latest = patient.checkIns[patient.checkIns.length - 1]?.ratings[key];
                return (
                  <tr key={key} className="border-b border-border last:border-0">
                    <th scope="row" className="py-3 pr-4 font-medium">{label}</th>
                    <td className="py-3 pr-4">{ratingDisplay(patient.baseline[key])}</td>
                    <td className="py-3">{ratingDisplay(latest)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PatientRosterLayout>
  );
}

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
      <PatientProgressChart
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
