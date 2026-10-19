import { Link } from 'wouter';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { BASE_PATH } from '@/lib/config';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-3 rounded-full font-serif text-xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        light ? 'text-primary-foreground' : 'text-foreground'
      }`}
      aria-label="Stillwell clinician portal home"
      data-testid="link-brand-home"
    >
      <img
        src={`${BASE_PATH}/logo.svg`}
        alt=""
        className="h-9 w-9"
        width="36"
        height="36"
      />
      <span>Stillwell</span>
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p data-testid="text-footer-context">
          For people in recovery?{' '}
          <a
            href="/"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
            data-testid="link-recovery-home"
          >
            Visit Stillwell
          </a>
        </p>
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-5">
          <Link
            href="/privacy"
            className="min-h-11 py-3 underline-offset-4 hover:text-foreground hover:underline"
            data-testid="link-privacy"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="min-h-11 py-3 underline-offset-4 hover:text-foreground hover:underline"
            data-testid="link-terms"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function PortalHeader({
  dashboard = false,
}: {
  dashboard?: boolean;
}) {
  return (
    <header className="border-b border-border bg-background/90">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-6">
        <Brand />
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary"
            data-testid="link-recovery-home-header"
          >
            For people in recovery
          </a>
          {dashboard ? (
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-secondary-foreground hover:bg-secondary"
              data-testid="link-edit-profile"
            >
              Your profile
            </Link>
          ) : (
            <Button asChild variant="outline" data-testid="button-header-sign-in">
              <Link href="/sign-in" className="whitespace-nowrap" data-testid="link-header-sign-in">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PageFooterCta() {
  return (
    <div className="rounded-3xl bg-secondary p-6 md:flex md:items-center md:justify-between md:gap-6 md:p-8">
      <div>
        <p className="font-serif text-2xl text-foreground">
          A thoughtful next step for your practice.
        </p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Set up a private professional profile. Patient journal sharing is
          planned, not active.
        </p>
      </div>
      <Link href="/join" className="mt-5 inline-flex md:mt-0">
        <Button size="default" data-testid="button-cta-create-account">
          Create a clinician account <ArrowUpRight aria-hidden="true" />
        </Button>
      </Link>
    </div>
  );
}
