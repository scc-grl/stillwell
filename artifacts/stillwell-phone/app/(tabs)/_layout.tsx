import { ActivityIndicator, Platform, StyleSheet, useColorScheme, View } from "react-native";
import { Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Screen } from "@/components/Screen";
import { usePatientData } from "@/contexts/PatientDataContext";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Icon
          sf={{ default: "sun.max", selected: "sun.max.fill" }}
        />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon
          sf={{ default: "clock", selected: "clock.fill" }}
        />
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
        />
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => (
            <Feather name="sun" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <Feather name="clock" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={21} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const {
    isLoaded,
    isSignedIn,
    accountType,
    accountTypeLoading,
    accountTypeError,
    refreshAccountType,
  } = usePatientData();

  if (!isLoaded) {
    return (
      <Screen bottomTabs>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }
  if (!isSignedIn) return <Redirect href="/auth?mode=sign-in" />;
  if (accountTypeError) {
    return (
      <Screen bottomTabs>
        <Card>
          <Text variant="heading">We couldn’t check your account type</Text>
          <Button tone="outline" onPress={refreshAccountType}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (accountTypeLoading || !accountType) {
    return (
      <Screen bottomTabs>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }
  if (accountType === "clinician") {
    return <Redirect href="/clinician-home" />;
  }
  if (accountType !== "patient") return <Redirect href="/" />;
  return isLiquidGlassAvailable() ? (
    <NativeTabLayout />
  ) : (
    <ClassicTabLayout />
  );
}
