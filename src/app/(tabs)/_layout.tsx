import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="records" options={{ title: 'Records' }} />
      <Tabs.Screen name="ekaay" options={{ title: 'Ekaay' }} />
      <Tabs.Screen name="care" options={{ title: 'Care' }} />
      <Tabs.Screen name="card" options={{ title: 'Card' }} />
    </Tabs>
  );
}
