import { useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { demoPatients, formatDemoDate, patientName, ratingLabel, symptoms, type DemoPatient } from "./_patientRosterDemo";
import { PatientRosterLayout } from "./_patientRosterLayout";

type ClinicianPatientProgressProps = {
  patient: DemoPatient;
  onBack: () => void;
};

function RatingCell({ value }: { value: number | undefined }) {
  return (
    <span className={value === undefined ? "text-muted-foreground" : "text-foreground"}>
      {ratingLabel(value)}
    </span>
  );
}

export function PatientProgressView({ patient, onBack }: ClinicianPatientProgressProps) {
  const [selectedDate, setSelectedDate] = useState(patient.checkIns[patient.checkIns.length - 1]?.date ?? "");
  const latest = patient.checkIns[patient.checkIns.length - 1];
  const selectedCheckIn = patient.checkIns.find(({ date }) => date === selectedDate);

  return (
    <PatientRosterLayout onBack={onBack}>
      <PatientProgressContent patient={patient} latest={latest} selectedDate={selectedDate} selectedCheckIn={selectedCheckIn} onSelectDate={setSelectedDate} />
    </PatientRosterLayout>
  );
}

type PatientProgressContentProps = {
  patient: DemoPatient;
  latest: DemoPatient["checkIns"][number] | undefined;
  selectedDate: string;
  selectedCheckIn: DemoPatient["checkIns"][number] | undefined;
  onSelectDate: (date: string) => void;
};

function PatientProgressContent({ patient, latest, selectedDate, selectedCheckIn, onSelectDate }: PatientProgressContentProps) {
  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient-reported journey · fictional profile</p>
            <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl">{patientName(patient)}</h1>
            <p className="text-sm text-muted-foreground">{patient.id} · {patient.status} in this demo workspace</p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Patient-selected sharing · simulated</span>
        </div>
        <Card>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Starting snapshot</p>
              <p className="mt-1 text-sm font-medium">{formatDemoDate(patient.baselineDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest check-in</p>
              <p className="mt-1 text-sm font-medium">{latest ? formatDemoDate(latest.date) : "No check-in supplied"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shared in this preview</p>
              <p className="mt-1 text-sm font-medium">{patient.sharedReflections ? "Symptom ratings and selected reflections" : "Symptom ratings"}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl font-medium tracking-tight">Progress at a glance</h2>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
          Compare the person’s starting snapshot with their latest supplied check-in. Responses are self-reported, may vary between dates, and do not explain what caused a change.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Symptom comparison</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Current journal scale: Not noticeable · Less noticeable · Noticeable · More noticeable. “Not supplied” means no value was provided for that date.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-3 pr-4 font-semibold">Symptom</th>
                  <th scope="col" className="py-3 pr-4 font-semibold">Starting snapshot · {formatDemoDate(patient.baselineDate)}</th>
                  <th scope="col" className="py-3 font-semibold">Latest supplied · {latest ? formatDemoDate(latest.date) : "—"}</th>
                </tr>
              </thead>
              <tbody>
                {symptoms.map(({ key, label }) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <th scope="row" className="py-3 pr-4 font-medium">{label}</th>
                    <td className="py-3 pr-4"><RatingCell value={patient.baseline[key]} /></td>
                    <td className="py-3"><RatingCell value={latest?.ratings[key]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pt-4 text-xs leading-5 text-muted-foreground">Baseline and latest values are shown side by side, without a score or inferred trend.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dated check-ins</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">Only supplied dates are shown. Gaps do not represent missing or assumed daily entries.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="py-2 pr-3 font-semibold">Check-in date</th>
                    {symptoms.map(({ key, label }) => <th key={key} scope="col" className="py-2 pr-3 font-semibold">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {patient.checkIns.map((entry) => (
                    <tr key={entry.date} className={`border-b border-border ${selectedDate === entry.date ? "bg-muted" : ""}`}>
                      <th scope="row" className="py-3 pr-3 font-medium">
                        <Button type="button" variant="link" size="sm" className="h-auto justify-start whitespace-nowrap p-0" aria-current={selectedDate === entry.date ? "date" : undefined} onClick={() => onSelectDate(entry.date)}>
                          {formatDemoDate(entry.date)}
                        </Button>
                      </th>
                      {symptoms.map(({ key }) => <td key={key} className="py-3 pr-3"><RatingCell value={entry.ratings[key]} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Choose a date to review a supplied reflection, when included in this simulated sharing scope.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected reflection</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">{selectedCheckIn ? formatDemoDate(selectedCheckIn.date) : "Choose a dated check-in"}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {patient.sharedReflections ? (
              selectedCheckIn?.reflection ? (
                <>
                  <blockquote className="border-l-2 border-border pl-4 text-sm leading-6">
                    “{selectedCheckIn.reflection}”
                  </blockquote>
                  <p className="text-xs leading-5 text-muted-foreground">Patient-entered reflection, shown as shared in this fictional example.</p>
                </>
              ) : (
                <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
                  No reflection was supplied for this selected check-in.
                </p>
              )
            ) : (
              <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
                Reflections are not included in this simulated sharing scope.
              </p>
            )}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Reading this preview</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This view describes reported answers and personal words only. It does not provide a diagnosis, treatment recommendation, or claim that a routine caused recovery.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function ClinicianPatientProgress() {
  const [selectedPatient, setSelectedPatient] = useState<DemoPatient>(demoPatients[0]);
  const [showRoster, setShowRoster] = useState(false);
  if (showRoster) {
    return (
      <PatientRosterLayout>
        <div className="space-y-3">
          <h1 className="font-serif text-3xl font-medium tracking-tight">Patient list</h1>
          <ul className="space-y-2">
            {demoPatients.map((patient) => (
              <li key={patient.id}>
                <Button type="button" variant="outline" className="w-full justify-between" onClick={() => { setSelectedPatient(patient); setShowRoster(false); }}>
                  {patientName(patient)} <span className="text-muted-foreground">{patient.status}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </PatientRosterLayout>
    );
  }
  return <PatientProgressView patient={selectedPatient} onBack={() => setShowRoster(true)} />;
}
