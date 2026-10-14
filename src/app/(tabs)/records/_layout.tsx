import { Stack } from 'expo-router';

/**
 * The Records list is always beneath a record, even one opened from another tab (a prescription
 * from Care's past consults, results from a pod booking), so Back lands on Records.
 */
export const unstable_settings = {
  anchor: 'index',
};

/** Records keeps its own stack so a record opens with the tab bar still showing. */
export default function RecordsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
