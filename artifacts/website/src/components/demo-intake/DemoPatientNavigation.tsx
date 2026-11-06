import { BookOpen, LayoutDashboard } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Brand } from "@/components/PublicSite";

export type DemoPatientSection = "dashboard" | "journal";

export function DemoPatientNavigation({
  section,
  onNavigate,
}: {
  section: DemoPatientSection;
  onNavigate: (section: DemoPatientSection) => void;
}) {
  function navigate(next: DemoPatientSection) {
    onNavigate(next);
  }

  return (
    <>
      <header className="sticky top-16 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:top-0">
        <Brand journal />
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
        </nav>
      </header>
    </>
  );
}
