import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, LayoutDashboard, Menu, X } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";

export type DemoView =
  | "story"
  | "reading"
  | "summary"
  | "roadmap"
  | "emergency"
  | "dashboard"
  | "journal";
export type Persona = "Maya J. (patient)" | "Ray F. (clinician)";

const NAV_STEPS: { view: DemoView; label: string }[] = [
  { view: "story", label: "1 Tell us your story" },
  { view: "summary", label: "2 Summary" },
  { view: "roadmap", label: "3 Where you might be today" },
];

export function DemoShell({
  view,
  setView,
  persona,
  setPersona,
  children,
}: {
  view: DemoView;
  setView: (view: DemoView) => void;
  persona: Persona;
  setPersona: (persona: Persona) => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showNav = (next: DemoView) => {
    setView(next);
    setMobileOpen(false);
  };
  const navItem = (target: DemoView, label: string, testId: string, icon?: ReactNode) => (
    <Button
      key={target}
      type="button"
      variant="ghost"
      onClick={() => showNav(target)}
      aria-current={view === target ? "page" : undefined}
      data-testid={testId}
      className={`flex min-h-11 w-full justify-start gap-3 rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background ${
        view === target
          ? "bg-background/15 font-semibold text-background"
          : "text-background/75 hover:bg-background/10 hover:text-background"
      }`}
    >
      {icon}{label}
    </Button>
  );
  const sidebar = (
    <>
      <div className="flex items-center gap-3 px-5 py-6">
        <img src={stillwellMark} alt="" className="size-9" />
        <span className="display text-2xl font-semibold tracking-tight text-background">stillwell</span>
      </div>
      <div className="mx-4 rounded-xl border border-background/20 bg-background/10 p-3">
        <p className="mb-2 text-xs font-medium text-background/70">Choose a demo person</p>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Demo persona">
          {(["Maya J. (patient)", "Ray F. (clinician)"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              variant="ghost"
              aria-pressed={persona === option}
              onClick={() => setPersona(option)}
              data-testid={`persona-${option.startsWith("Maya") ? "maya" : "ray"}`}
              className={`min-h-11 rounded-lg px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background ${
                persona === option ? "bg-background text-foreground" : "text-background/80 hover:bg-background/10"
              }`}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
      <nav className="mt-7 space-y-6 px-3" aria-label="Demo navigation">
        <div>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-background/55">The intake</p>
          <div className="space-y-1">
            {NAV_STEPS.map((item) => navItem(item.view, item.label, `nav-${item.view}`))}
          </div>
        </div>
        <div>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-background/55">Every day</p>
          <div className="space-y-1">
            {navItem("dashboard", "Dashboard", "nav-dashboard", <LayoutDashboard className="size-4" />)}
            {navItem("journal", "Journal", "nav-journal", <BookOpen className="size-4" />)}
          </div>
        </div>
      </nav>
      <div className="mt-auto space-y-4 p-4">
        <p className="rounded-lg border border-background/20 bg-background/10 p-3 text-xs leading-5 text-background/85" data-testid="demo-privacy-notice">
          Made-up people and made-up data. Nothing you enter is saved.
        </p>
        <Link
          href="/"
          data-testid="link-exit-demo"
          className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-background/75 hover:bg-background/10 hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
        >
          <ArrowLeft className="size-4" /> Exit demo
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-foreground lg:flex" data-testid="demo-sidebar">
        {sidebar}
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-8 lg:hidden">
          <div className="flex items-center gap-2">
            <img src={stillwellMark} alt="" className="size-8" />
            <span className="display text-xl font-semibold">stillwell</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={mobileOpen ? "Close demo navigation" : "Open demo navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            data-testid="button-demo-mobile-nav"
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </header>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-foreground lg:hidden">
            <div className="flex h-full flex-col overflow-y-auto">
              <div className="flex justify-end px-4 pt-3">
                <Button type="button" variant="outline" className="min-h-11 border-background/30 text-background" onClick={() => setMobileOpen(false)} data-testid="button-close-demo-nav">
                  <X aria-hidden="true" /> Close navigation
                </Button>
              </div>
              {sidebar}
            </div>
          </div>
        )}
        <p className="border-b border-border bg-secondary px-4 py-2 text-center text-xs leading-5 text-secondary-foreground lg:hidden" data-testid="demo-privacy-notice-mobile">
          Made-up people and made-up data. Nothing you enter is saved.
        </p>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
