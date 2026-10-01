import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { EkaayInsightCard } from '@/features/home/ekaay-insight-card';
import { EmergencyBanner } from '@/features/home/emergency-banner';
import { HomeHeader } from '@/features/home/home-header';
import { QuickActions, type QuickActionId } from '@/features/home/quick-actions';
import { ReadingCard } from '@/features/home/reading-card';
import { sampleHome } from '@/features/home/sample-data';

// Until the booking, consult and upload flows exist, each action opens its tab.
const ACTION_ROUTES: Record<QuickActionId, Href> = {
  'ask-ekaay': '/ekaay',
  'video-consult': '/care',
  'book-pod': '/care',
  'add-records': '/records',
};

export default function HomeScreen() {
  const { member, hasUnreadNotifications, readings, insight, emergencyQr } = sampleHome;

  return (
    <Screen>
      <View style={styles.sections}>
        <HomeHeader
          firstName={member.firstName}
          initials={member.initials}
          hasUnread={hasUnreadNotifications}
        />

        <View style={styles.section}>
          <SectionHeader
            title="Your latest readings"
            actionLabel="See all"
            onAction={() => router.navigate('/records')}
          />
          <View style={styles.readings}>
            {readings.map((reading) => (
              <ReadingCard key={reading.id} reading={reading} />
            ))}
          </View>
        </View>

        <EkaayInsightCard
          insight={insight}
          primaryLabel="Book HbA1c"
          onPrimary={() => router.navigate('/care')}
          secondaryLabel="Ask Ekaay why"
          onSecondary={() => router.navigate('/ekaay')}
        />

        <QuickActions onPress={(id) => router.navigate(ACTION_ROUTES[id])} />

        <EmergencyBanner
          isOn={emergencyQr.isOn}
          carriers={emergencyQr.carriers}
          onPress={() => router.navigate('/card')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.three + 4,
  },
  section: {
    gap: Spacing.two + 2,
  },
  readings: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
