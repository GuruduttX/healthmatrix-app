import { Stack } from 'expo-router';

/** Family screens: adding someone (a modal), and each family member's records. */
export default function FamilyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
