import { router, useFocusEffect, type Href } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Aurora } from '@/components/ui/glass';
import { Section } from '@/components/ui/section';
import { Colors, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { refreshAppointments } from '@/features/doctors/use-appointments';
import { refreshConsultRequests } from '@/features/doctors/use-consult-requests';
import { useFaceScans } from '@/features/face-scan/use-face-scans';
import { refreshFamily } from '@/features/family/use-family';
import { CareBanner } from '@/features/home/care-banner';
import { EkaayInsightCard } from '@/features/home/ekaay-insight-card';
import { FaceScanCard } from '@/features/home/face-scan-card';
import { FamilyStrip } from '@/features/home/family-strip';
import { HealthCard } from '@/features/home/health-card';
import { HomeHeader } from '@/features/home/home-header';
import { GUTTER } from '@/features/home/layout';
import { withScannedPulse } from '@/features/home/pulse-from-scan';
import { QuickActions, type QuickActionId } from '@/features/home/quick-actions';
import { sampleHome } from '@/features/home/sample-data';
import { TodayPlan } from '@/features/home/today-plan';
import { VitalsCard } from '@/features/home/vital-card';
import { useNotifications } from '@/features/notifications/use-notifications';
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

const findGeneralPhysician = () =>
  router.navigate({
    pathname: '/care/doctors/[specialty]',
    params: { specialty: 'general_medicine' },
  });

export default function HomeScreen() {
  const { member, refreshMember } = useAuth();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const { readings, insight, emergencyQr } = sampleHome;
  // The bell's dot: something needs attention now (a dose due, a consult starting).
  const { notices } = useNotifications();
  const hasUnread = notices?.some((notice) => notice.urgent) ?? false;
  // The last face scan, fetched again whenever Home comes back (after a scan, say).
  const { scans: faceScans } = useFaceScans();
  // The pulse is the latest face scan's; the other vitals are still sample data.
  const vitals = withScannedPulse(readings, faceScans);

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

  return (
    <View style={styles.screen}>
      {/* The light stands still behind the page, so the glass slides over it as you scroll. */}
      <Aurora />
      {/* Starts under the status bar: the page scrolls away there instead of under the clock. */}
      <ScrollView
        style={[styles.scroll, { marginTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}>
        <View
          style={[
            styles.content,
            { paddingTop: Spacing.three, paddingBottom: clearance + Spacing.four },
          ]}>
          <HomeHeader
            name={member?.name ?? ''}
            abhaLinked={member?.abhaLinked}
            hasUnread={hasUnread}
            onPressProfile={() => router.push('/profile')}
            onPressNotifications={() => router.push('/notifications')}
          />

          {/* Closer to the greeting above and the banner below than the page's other sections. */}
          <View style={styles.services}>
            <Section index={0}>
              <QuickActions onPress={(id) => router.navigate(ACTION_ROUTES[id])} />
            </Section>
          </View>

          <Section index={1}>
            <CareBanner onPress={() => askEkaay()} />
          </Section>

          <Section
            title="Your vitals"
            actionLabel="See all"
            onAction={() => router.navigate('/records')}
            index={2}>
            <VitalsCard
              readings={vitals}
              actions={{ pulse: () => router.push('/face-scan') }}
            />
          </Section>

          <Section index={3}>
            <TodayPlan />
          </Section>

          <Section index={4}>
            <FaceScanCard latest={faceScans?.[0]} onScan={() => router.push('/face-scan')} />
          </Section>

          <Section index={5}>
            <EkaayInsightCard
              insight={insight}
              primaryLabel="Book HbA1c"
              onPrimary={() => router.navigate('/care/pods')}
              secondaryLabel="Ask why"
              onSecondary={() => askEkaay('Why is my fasting sugar rising?')}
              onTalkToDoctor={findGeneralPhysician}
            />
          </Section>

          <FamilyStrip index={6} />

          <Section title="Safety" index={7}>
            <HealthCard
              memberId={member?.memberId}
              abhaLinked={member?.abhaLinked}
              qrOn={emergencyQr.isOn}
              carriers={emergencyQr.carriers}
              onPress={() => router.navigate('/card')}
            />
          </Section>

          <View style={styles.trust}>
            <Lock size={13} color={Colors.textFaint} strokeWidth={2.2} />
            <ThemedText style={styles.trustText}>
              Encrypted, and shared only with your consent
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four - 4,
    paddingHorizontal: GUTTER,
  },
  services: {
    marginTop: -Spacing.two,
    marginBottom: -Spacing.one,
  },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -Spacing.two,
  },
  trustText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
