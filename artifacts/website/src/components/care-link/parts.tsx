import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Brand } from "@/components/PublicSite";

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

/** Backs up the index.html guard: no-referrer for the rest of this document. */
export function useNoReferrer() {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="referrer"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "referrer";
      document.head.prepend(meta);
    }
    meta.content = "no-referrer";
  }, []);
}

/** Follows the OS color scheme with the design system's existing .dark tokens. */
export function useSystemDark(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setDark(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return dark;
}

export function LinkShell({ children, signedInAs }: { children: ReactNode; signedInAs?: string | null }) {
  useNoReferrer();
  const dark = useSystemDark();
  return <div className={cn("flex min-h-[100dvh] flex-col bg-background text-foreground", dark && "dark")}>
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Brand />
        {signedInAs ? <p className="truncate text-sm text-muted-foreground" data-testid="text-signed-in-as">
          Signed in as <span className="font-semibold text-foreground">{signedInAs}</span>
        </p> : null}
      </div>
    </header>
    <main id="main" className="flex flex-1 flex-col">{children}</main>
  </div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground">{children}</p>;
}

export function IconCircle({ icon: I }: { icon: Icon }) {
  return <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
    <I className="size-6" aria-hidden />
  </span>;
}

/** Centered card for every edge state: icon circle, heading, body, actions. */
export function EdgeCard({ icon, heading, body, children, testId, extra }: {
  icon: Icon;
  heading: string;
  body: ReactNode;
  children?: ReactNode;
  testId?: string;
  extra?: ReactNode;
}) {
  return <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
    <Card className="w-full max-w-lg space-y-5 p-6 sm:p-9" data-testid={testId}>
      <IconCircle icon={icon} />
      <h1 className="font-serif text-3xl font-medium leading-tight">{heading}</h1>
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">{typeof body === "string" ? <p>{body}</p> : body}</div>
      {extra}
      {children ? <div className="flex flex-col gap-3 pt-1">{children}</div> : null}
    </Card>
  </div>;
}

export function LoadingBlock({ label }: { label: string }) {
  return <div className="flex flex-1 items-center justify-center px-5 py-12">
    <Card className="w-full max-w-lg space-y-4 p-6 sm:p-9" role="status" aria-label={label} data-testid="status-link-loading">
      <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
      <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
      <div className="h-8 w-4/5 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">{label}</span>
    </Card>
  </div>;
}

export function ErrorLine({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="text-sm leading-6 text-destructive" data-testid="status-link-error">{children}</p>;
}
