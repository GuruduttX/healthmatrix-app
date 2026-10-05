import { Stack } from 'expo-router';

/** Records keeps its own stack so a record opens with the tab bar still showing. */
export default function RecordsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
