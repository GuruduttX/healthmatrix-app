import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
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

import { BrandSplash } from '@/components/brand-splash';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { ReminderNotifications } from '@/features/reminders/reminder-notifications';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.backgroundElement,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!token}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="responder-preview" options={{ presentation: 'modal' }} />
            <Stack.Screen name="profile" />
            <Stack.Screen name="emergency-profile" />
            <Stack.Screen name="family" />
            <Stack.Screen
              name="consult/[id]"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
                gestureEnabled: false,
                contentStyle: { backgroundColor: Colors.ink },
              }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!token}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
      {isLoading ? null : <ReminderNotifications />}
      <BrandSplash ready={!isLoading} />
    </>
  );
}
