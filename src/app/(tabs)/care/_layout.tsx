import { Stack } from 'expo-router';

/** Screens opened straight from a link or notification still have the Care page beneath them. */
export const unstable_settings = {
  anchor: 'index',
};

/** Care keeps its own stack so screens like the pod finder open with the tab bar still showing. */
export default function CareLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
