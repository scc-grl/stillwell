import { useState } from "react";
import { BookOpen, ClipboardList, LayoutDashboard, Settings2, UsersRound, X } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";

export type DemoPatientSection = "dashboard" | "journal";

const previewSections = [
  { label: "Care protocol", icon: ClipboardList },
  { label: "Care team", icon: UsersRound },
  { label: "Account", icon: Settings2 },
] as const;

export function DemoPatientNavigation({
  section,
  onNavigate,
}: {
  section: DemoPatientSection;
  onNavigate: (section: DemoPatientSection) => void;
}) {
  const [previewSection, setPreviewSection] = useState<string | null>(null);

  function navigate(next: DemoPatientSection) {
    setPreviewSection(null);
    onNavigate(next);
  }

  return (
    <>
      <header className="sticky top-16 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:top-0">
        <div className="flex items-center gap-2">
          <img src={stillwellMark} alt="" className="size-7" />
          <span className="display text-xl font-semibold tracking-tight">stillwell</span>
        </div>
        <nav aria-label="Maya's Stillwell" className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant={section === "dashboard" ? "secondary" : "ghost"}
            size="sm"
            aria-current={section === "dashboard" ? "page" : undefined}
            onClick={() => navigate("dashboard")}
            data-testid="demo-patient-nav-dashboard"
          >
            <LayoutDashboard aria-hidden="true" />Dashboard
          </Button>
          <Button
            type="button"
            variant={section === "journal" ? "secondary" : "ghost"}
            size="sm"
            aria-current={section === "journal" ? "page" : undefined}
            onClick={() => navigate("journal")}
            data-testid="demo-patient-nav-journal"
          >
            <BookOpen aria-hidden="true" />Journal
          </Button>
          {previewSections.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              type="button"
              variant={previewSection === label ? "secondary" : "ghost"}
              size="sm"
              aria-expanded={previewSection === label}
              onClick={() => setPreviewSection((current) => current === label ? null : label)}
              data-testid={`demo-patient-nav-${label.toLowerCase().replace(" ", "-")}`}
            >
              <Icon aria-hidden="true" />{label}
            </Button>
          ))}
        </nav>
      </header>
      {previewSection && (
        <Card className="mt-4 flex items-start justify-between gap-4 p-4" role="region" aria-label={`${previewSection} sample information`}>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{previewSection} · demo only</p>
            <p className="text-sm leading-6 text-muted-foreground">
              This area is outside Maya’s Dashboard and Journal preview. No care-team access, account, or privacy settings are connected in this example.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={`Close ${previewSection} preview`} onClick={() => setPreviewSection(null)}>
            <X aria-hidden="true" />
          </Button>
        </Card>
      )}
    </>
  );
}
