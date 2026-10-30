import { Card } from "@workspace/stillwell-design-system/components/ui/card";

export function RayForthcomingScreen({ view }: { view: string }) {
  const labels: Record<string, string> = {
    "ray-patients": "Your patients",
    "ray-intake": "Maya J. · Intake summary",
    "ray-insights": "Maya J. · Insights",
    "ray-journal": "Maya J. · Journal",
    "ray-day": "Maya J. · One day in detail",
    "ray-messages": "Maya J. · Messages",
  };
  return (
    <section className="space-y-6" data-testid="ray-forthcoming">
      <header className="space-y-3">
        <p className="eyebrow">Ray's view · sample</p>
        <h1 className="display text-4xl font-medium sm:text-5xl">{labels[view] ?? "Clinician view"}</h1>
      </header>
      <Card className="space-y-3 border-primary/30 bg-secondary p-6 sm:p-8">
        <p className="font-semibold">Demo Coming soon</p>
      </Card>
    </section>
  );
}
