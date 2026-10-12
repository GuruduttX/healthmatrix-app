import { router, useFocusEffect, useIsFocused, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Lock } from 'lucide-react-native';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Plans } from '@/constants/plans';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { refreshAppointments } from '@/features/doctors/use-appointments';
import { refreshConsultRequests } from '@/features/doctors/use-consult-requests';
import { suggestedQuestions } from '@/features/ekaay/sample-data';
import { refreshFamily } from '@/features/family/use-family';
import { sampleCare } from '@/features/care/sample-data';
import { CareCarousel, type CareCard } from '@/features/home/care-carousel';
import { EkaayInsightCard } from '@/features/home/ekaay-insight-card';
import { EmergencyBanner } from '@/features/home/emergency-banner';
import { FamilyStrip } from '@/features/home/family-strip';
import { HomeHero } from '@/features/home/home-hero';
import { HomeSection } from '@/features/home/home-section';
import { QuickActions, type QuickActionId } from '@/features/home/quick-actions';
import { ReadingCard } from '@/features/home/reading-card';
import { sampleHome } from '@/features/home/sample-data';
import { TodayPlan } from '@/features/home/today-plan';
import { useNotifications } from '@/features/notifications/use-notifications';
import { formatShortDate, toDateKey, WEEKDAY_NAMES } from '@/features/reminders/schedule';
import { refreshReminders } from '@/features/reminders/use-reminders';
import { refreshVaccinations } from '@/features/vaccines/use-vaccinations';
import { useRefreshControl } from '@/hooks/use-refresh-control';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

const ACTION_ROUTES: Record<QuickActionId, Href> = {
  'video-consult': '/care',
  'book-pod': '/care/pods',
  medicines: '/care/medicines',
  'add-records': '/records',
};

/** Opens Ekaay, asking `question` when one was tapped. */
function askEkaay(question?: string) {
  router.navigate(question ? { pathname: '/ekaay', params: { q: question } } : '/ekaay');
}

const nearestPod = sampleCare.pods.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a));

/** The photo cards under "Care for you". */
const careCards: CareCard[] = [
  {
    id: 'pods',
    image: require('@/assets/images/home/book-pod.jpg'),
    tag: `${nearestPod.distanceKm} km away`,
    title: 'Screening pods near you',
    caption: `${nearestPod.name} · results in minutes`,
    action: 'Book Pod',
    onPress: () => router.navigate('/care/pods'),
  },
  {
    id: 'doctors',
    image: require('@/assets/images/home/video-consult.jpg'),
    tag: 'Video consult',
    title: 'See a doctor from home',
    caption: 'They’ll have your history open',
    action: 'Find a doctor',
    onPress: () =>
      router.navigate({
        pathname: '/care/doctors/[specialty]',
        params: { specialty: 'general_medicine' },
      }),
  },
  {
    id: 'records',
    image: require('@/assets/images/home/add-records.jpg'),
    tag: 'Records',
    title: 'Bring your old reports',
    caption: 'Snap a photo or forward a PDF',
    action: 'Open Records',
    onPress: () => router.navigate('/records'),
  },
  {
    id: 'ekaay',
    image: require('@/assets/images/home/ask-ekaay.jpg'),
    tag: 'Ekaay AI',
    title: 'Questions about a report?',
    caption: 'Answers from your own records',
    action: 'Ask Ekaay',
    onPress: () => askEkaay(),
  },
];

export default function HomeScreen() {
  const { member, refreshMember } = useAuth();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  // Light status bar text over the hero, only while Home is showing.
  const focused = useIsFocused();
  const { readings, insight, emergencyQr } = sampleHome;
  // The bell's dot: something needs attention now (a dose due, a consult starting).
  const { notices } = useNotifications();
  const hasUnread = notices?.some((notice) => notice.urgent) ?? false;

  const memberId = member?.id;
  // The cards below read shared stores; refreshing those updates each card.
  const refreshControl = useRefreshControl(
    () =>
      Promise.allSettled([
        refreshMember(),
        ...(memberId
          ? [
              refreshAppointments(memberId),
              refreshConsultRequests(memberId),
              refreshReminders(memberId),
              refreshVaccinations(memberId),
              refreshFamily(memberId),
            ]
          : []),
      ]),
    // The spinner shows over the dark hero, below the status bar.
    { tintColor: Colors.onInk, progressViewOffset: insets.top },
  );

  // A doctor can start or cancel a consult, or prescribe a vaccine, from the console while the
  // member is elsewhere: check again whenever Home comes back into view.
  useFocusEffect(
    useCallback(() => {
      if (!memberId) return;
      void Promise.allSettled([
        refreshAppointments(memberId),
        refreshConsultRequests(memberId),
        refreshVaccinations(memberId),
      ]);
    }, [memberId]),
  );

  const now = new Date();
  const todayLabel = `${WEEKDAY_NAMES[now.getDay()]}, ${formatShortDate(toDateKey(now))}`;

  return (
    <View style={styles.screen}>
      {focused ? <StatusBar style="light" /> : null}
      {/* Dark behind the content, so pulling down shows ink above the hero (and the spinner). */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={styles.content}>
        <HomeHero
          name={member?.name ?? ''}
          photoUrl={member?.photoUrl}
          planName={member ? Plans[member.plan]?.name : undefined}
          abhaLinked={member?.abhaLinked}
          hasUnread={hasUnread}
          topInset={insets.top}
          suggestions={suggestedQuestions}
          onPressProfile={() => router.push('/profile')}
          onPressNotifications={() => router.push('/notifications')}
          onAsk={askEkaay}
        />

        {/* Everything under the hero sits on the light page colour. */}
        <View style={[styles.lower, { paddingBottom: clearance + Spacing.four }]}>
          <View style={styles.bounce} />
          <View style={styles.body}>
            <QuickActions onPress={(id) => router.navigate(ACTION_ROUTES[id])} />

            <HomeSection title="Today" meta={todayLabel} index={0}>
              <TodayPlan />
            </HomeSection>

            <HomeSection
              title="Your vitals"
              actionLabel="See all"
              onAction={() => router.navigate('/records')}
              index={1}>
              <View style={styles.grid}>
                {readings.map((reading) => (
                  <ReadingCard key={reading.id} reading={reading} />
                ))}
              </View>
            </HomeSection>

            <HomeSection index={2}>
              <EkaayInsightCard
                insight={insight}
                primaryLabel="Book HbA1c"
                onPrimary={() => router.navigate('/care/pods')}
                secondaryLabel="Ask why"
                onSecondary={() => askEkaay('Why is my fasting sugar rising?')}
              />
            </HomeSection>

            <HomeSection title="Care for you" index={3}>
              <CareCarousel cards={careCards} />
            </HomeSection>

            <FamilyStrip index={4} />

            <HomeSection title="Safety" index={5}>
              <EmergencyBanner
                isOn={emergencyQr.isOn}
                carriers={emergencyQr.carriers}
                onPress={() => router.navigate('/card')}
              />
            </HomeSection>

            <View style={styles.trust}>
              <Lock size={13} color={Colors.textMuted} strokeWidth={2.2} />
              <ThemedText type="caption" themeColor="textMuted">
                Encrypted, and shared only with your consent
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    backgroundColor: Colors.inkDeep,
  },
  content: {
    flexGrow: 1,
  },
  lower: {
    flexGrow: 1,
    backgroundColor: Colors.background,
  },
  // Light below the last section too, for the bounce at the bottom on iOS.
  bounce: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: Colors.background,
  },
  body: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four + 4,
    paddingHorizontal: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 4,
  },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -Spacing.two,
  },
});
