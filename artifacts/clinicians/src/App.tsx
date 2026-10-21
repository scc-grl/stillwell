import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { BASE_PATH } from '@/lib/config';
import HomePage from '@/pages/home';
import JoinPage from '@/pages/join';
import ProfilePage from '@/pages/profile';
import DashboardPage from '@/pages/dashboard';
import ContinuePage from '@/pages/continue';
import NoticesPage from '@/pages/notices';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { pendingInviteEmail, reconcileCareLink } from '@/lib/care-link';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function stripBase(path: string): string {
  return BASE_PATH && path.startsWith(BASE_PATH)
    ? path.slice(BASE_PATH.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: BASE_PATH || '/',
    logoImageUrl: `${window.location.origin}${BASE_PATH}/logo.svg`,
  },
  variables: {
    colorPrimary: '#315b49',
    colorForeground: '#253b34',
    colorMutedForeground: '#626d62',
    colorDanger: '#ba4e3b',
    colorBackground: '#fbfaf5',
    colorInput: '#fbfaf5',
    colorInputForeground: '#253b34',
    colorNeutral: '#dfe5db',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-card rounded-2xl w-full max-w-lg overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-foreground font-serif',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground',
    formFieldLabel: 'text-foreground',
    footerActionLink: 'text-primary',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-primary',
    alertText: 'text-foreground',
    logoBox: 'mb-2',
    logoImage: 'h-9 w-auto',
    socialButtonsBlockButton: 'border-border bg-card text-foreground',
    formButtonPrimary: 'min-h-12 rounded-full',
    formFieldInput: 'min-h-12 rounded-xl border-border bg-card text-foreground',
    footerAction: 'text-muted-foreground',
    dividerLine: 'bg-border',
    alert: 'rounded-xl border-border',
    otpCodeFieldInput: 'rounded-xl border-border',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function SignInPage() {
  const [prefillEmail] = useState(pendingInviteEmail);
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-5 py-10">
      <SignIn
        routing="path"
        path={`${BASE_PATH}/sign-in`}
        signUpUrl={`${BASE_PATH}/sign-up`}
        forceRedirectUrl={`${BASE_PATH}/account/continue`}
        initialValues={prefillEmail ? { emailAddress: prefillEmail } : undefined}
      />
    </main>
  );
}

function SignUpPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-5 py-10">
      <SignUp
        routing="path"
        path={`${BASE_PATH}/sign-up`}
        signInUrl={`${BASE_PATH}/sign-in`}
        forceRedirectUrl={`${BASE_PATH}/account/continue`}
      />
    </main>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
        reconcileCareLink(prevUserIdRef.current, userId);
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function Router() {
  const [, setLocation] = useLocation();

  return (
    <RoutedErrorBoundary>
      <ClerkProvider
        telemetry={{ disabled: true }}
        publishableKey={clerkPubKey}
        proxyUrl={clerkProxyUrl}
        appearance={clerkAppearance}
        signInUrl={`${BASE_PATH}/sign-in`}
        signUpUrl={`${BASE_PATH}/sign-up`}
        localization={{
          signIn: {
            start: {
              title: 'Welcome back',
              subtitle: 'Sign in to your Stillwell clinician account.',
            },
          },
          signUp: {
            start: {
              title: 'Create your clinician account',
              subtitle: 'A private professional space, built at your pace.',
            },
          },
        }}
        routerPush={(to) => setLocation(stripBase(to))}
        routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      >
        <QueryClientProvider client={queryClient}>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/join" component={JoinPage} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/account/continue" component={ContinuePage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/privacy">
              <NoticesPage type="privacy" />
            </Route>
            <Route path="/terms">
              <NoticesPage type="terms" />
            </Route>
            <Route component={NotFound} />
          </Switch>
        </QueryClientProvider>
      </ClerkProvider>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={BASE_PATH}>
      <Router />
    </WouterRouter>
  );
}

export default App;
