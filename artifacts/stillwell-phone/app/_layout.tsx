import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ClerkLoaded,
  ClerkProvider,
  useAuth,
} from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { useStillwellFonts } from "@workspace/stillwell-design-system/hooks/use-fonts";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { PatientDataProvider } from "@/contexts/PatientDataContext";
import {
  clearConsentedDraft,
  isPendingPatientSignup,
} from "@/lib/draft";
import { Text } from "@workspace/stillwell-design-system/components/native/text";

void SplashScreen.preventAutoHideAsync();

const apiDomain = process.env.EXPO_PUBLIC_DOMAIN;
setBaseUrl(apiDomain ? `https://${apiDomain}` : null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 20_000,
    },
  },
});

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function SessionLifecycle({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, userId } = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const colors = useColors();

  setAuthTokenGetter(() => getToken());

  useEffect(() => {
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    const currentUserId = userId ?? null;
    const previous = previousUserId.current;
    if (previous !== undefined && previous !== currentUserId) {
      queryClient.clear();
      const isPatientSignupHandoff =
        previous === null &&
        currentUserId !== null &&
        isPendingPatientSignup();
      if (!isPatientSignupHandoff) {
        void clearConsentedDraft();
      }
    }
    previousUserId.current = currentUserId;
  }, [isLoaded, userId]);

  return (
    <PatientDataProvider>
      {children}
      {!isLoaded ? (
        <View
          accessibilityLabel="Loading Stillwell"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
          }}
        >
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption">Opening Stillwell…</Text>
        </View>
      ) : null}
    </PatientDataProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useStillwellFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      proxyUrl={clerkProxyUrl}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <SessionLifecycle>
                    <RootLayoutNav />
                  </SessionLifecycle>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
