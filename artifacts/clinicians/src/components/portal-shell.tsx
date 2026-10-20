import { useState } from 'react';
import { useAuth } from '@clerk/react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { BASE_PATH } from '@/lib/config';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-3 rounded-full font-serif text-[21px] font-semibold tracking-[-.04em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
      <span>stillwell</span>
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
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
  const { isSignedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const navigation = [
    { label: 'For people in recovery', href: '/', external: true },
    { label: 'Resources', href: '/faqs', external: true },
    { label: 'For clinicians', href: `${BASE_PATH}/`, external: true },
  ];
  const headerNavigation = isSignedIn
    ? dashboard
      ? [{ label: 'Patients', href: '/dashboard', external: false }]
      : []
    : navigation;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-3 sm:px-8 lg:px-12 lg:py-4">
        <Brand />
        {headerNavigation.length > 0 && (
          <nav className="hidden items-center gap-6 text-[12px] font-medium text-muted-foreground lg:flex" aria-label="Main navigation">
            {headerNavigation.map(({ label, href, external }) => (
              external ? (
                <a key={label} href={href} data-testid={`link-clinician-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                  {label}
                </a>
              ) : (
                <Link key={label} href={href} data-testid={`link-clinician-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                  {label}
                </Link>
              )
            ))}
          </nav>
        )}
        <div className="hidden items-center gap-3 lg:flex">
          {dashboard ? (
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary"
              data-testid="link-edit-profile"
            >
              Your profile
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary"
                data-testid="link-header-sign-in"
              >
                Sign in
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                data-testid="link-header-create-account"
              >
                Create account <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-secondary lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="mobile-clinician-navigation"
          data-testid="button-clinician-mobile-menu"
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>
      {menuOpen && (
        <nav
          id="mobile-clinician-navigation"
          className="grid gap-1 border-t border-border bg-background px-5 py-3 lg:hidden"
          aria-label="Mobile navigation"
        >
          {headerNavigation.map(({ label, href, external }) => (
            external ? (
              <a
                key={label}
                href={href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 text-sm text-secondary-foreground hover:bg-secondary"
                data-testid={`link-mobile-clinician-${label.toLowerCase().replaceAll(' ', '-')}`}
              >
                {label}
              </a>
            ) : (
              <Link
                key={label}
                href={href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 text-sm text-secondary-foreground hover:bg-secondary"
                data-testid={`link-mobile-clinician-${label.toLowerCase().replaceAll(' ', '-')}`}
              >
                {label}
              </Link>
            )
          ))}
          {dashboard ? (
            <Link
              href="/profile"
              onClick={closeMenu}
              className="rounded-lg px-3 py-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary"
              data-testid="link-mobile-edit-profile"
            >
              Your profile
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                onClick={closeMenu}
                className="px-3 py-3 text-sm font-semibold text-secondary-foreground"
                data-testid="link-mobile-clinician-sign-in"
              >
                Sign in
              </Link>
              <Link
                href="/join"
                onClick={closeMenu}
                className="rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                data-testid="link-mobile-clinician-create-account"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      )}
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
