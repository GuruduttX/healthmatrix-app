import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { BrandSplash } from '@/components/brand-splash';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { ReminderNotifications } from '@/features/reminders/reminder-notifications';
import { useHydrated } from '@/hooks/use-hydrated';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.canvas,
    card: Colors.backgroundElement,
    text: Colors.text,
    border: Colors.hairline,
  },
};

export default function RootLayout() {
  // On web the page is rendered on the server first, where there's no window size, signed-in
  // member or loaded fonts. Everything here depends on those, so the server and the browser's
  // first pass draw only the page colour, and the app itself renders in the browser.
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: Colors.canvas }} />;
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { token, isLoading } = useAuth();

  return (
    <>
      {isLoading ? null : (
        // Each guard says where a refused visitor goes. Since SDK 58 the default is the stack's
        // first screen, which for the signed-out side is the `(auth)` group itself, not a page.
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!token} redirectTo="/login">
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="responder-preview" options={{ presentation: 'modal' }} />
            <Stack.Screen name="profile" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="emergency-profile" />
            <Stack.Screen name="lock-screen-qr" />
            <Stack.Screen name="family" />
            <Stack.Screen name="face-scan" />
            <Stack.Screen
              name="consult/[id]"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
                gestureEnabled: false,
                // The waiting room and messages are on the warm page; the live call paints its own ink.
                contentStyle: { backgroundColor: Colors.canvas },
              }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!token} redirectTo="/">
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
      {isLoading ? null : <ReminderNotifications />}
      <BrandSplash ready={!isLoading} />
    </>
  );
}
