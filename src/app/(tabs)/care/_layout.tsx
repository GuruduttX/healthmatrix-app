import { Stack } from 'expo-router';

/** Care keeps its own stack so screens like the pod finder open with the tab bar still showing. */
export default function CareLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
