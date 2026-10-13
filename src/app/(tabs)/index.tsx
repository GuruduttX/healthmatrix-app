import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Section } from '@/components/ui/section';
import { Plans } from '@/constants/plans';
import { Colors, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { refreshAppointments } from '@/features/doctors/use-appointments';
import { refreshConsultRequests } from '@/features/doctors/use-consult-requests';
import { suggestedQuestions } from '@/features/ekaay/sample-data';
import { refreshFamily } from '@/features/family/use-family';
import { AskEkaay } from '@/features/home/ask-ekaay';
import { EkaayInsightCard } from '@/features/home/ekaay-insight-card';
import { FamilyStrip } from '@/features/home/family-strip';
import { HealthCard } from '@/features/home/health-card';
import { HomeHeader } from '@/features/home/home-header';
import { GUTTER } from '@/features/home/layout';
import { QuickActions, type QuickActionId } from '@/features/home/quick-actions';
import { sampleHome } from '@/features/home/sample-data';
import { TodayPlan } from '@/features/home/today-plan';
import { VitalCard } from '@/features/home/vital-card';
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

/** The colour at the very top of the page, where the morning light is strongest. */
const GLOW_TOP = '#F9EBE1';

/**
 * Warm light behind the top of Home that scrolls away with the greeting: a pale peach wash fading
 * into the page, a touch brighter in the top right. Both are gradient layers that fade out well
 * inside their box, so no edge ever shows.
 */
function MorningLight() {
  return (
    <View style={styles.light}>
      <LinearGradient
        colors={[GLOW_TOP, 'rgba(250, 239, 231, 0.7)', 'rgba(248, 245, 240, 0)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(240, 128, 72, 0.14)', 'rgba(240, 128, 72, 0)']}
        locations={[0, 0.5]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export default function HomeScreen() {
  const { member, refreshMember } = useAuth();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
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
    { progressViewOffset: insets.top },
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

  const planName = member ? Plans[member.plan]?.name : undefined;

  return (
    <View style={styles.screen}>
      {/* Peach behind the page, so pulling down shows the light's colour above the greeting. */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={styles.page}>
        <MorningLight />
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + Spacing.three, paddingBottom: clearance + Spacing.four },
          ]}>
          <View style={styles.top}>
            <HomeHeader
              name={member?.name ?? ''}
              photoUrl={member?.photoUrl}
              planName={planName}
              abhaLinked={member?.abhaLinked}
              hasUnread={hasUnread}
              onPressProfile={() => router.push('/profile')}
              onPressNotifications={() => router.push('/notifications')}
            />
            <AskEkaay suggestions={suggestedQuestions.slice(0, 3)} onAsk={askEkaay} />
          </View>

          {/* Closer to the greeting above and the Today card below than the page's other sections. */}
          <View style={styles.services}>
            <Section index={0}>
              <QuickActions onPress={(id) => router.navigate(ACTION_ROUTES[id])} />
            </Section>
          </View>

          <Section index={1}>
            <TodayPlan />
          </Section>

          <Section
            title="Your vitals"
            actionLabel="See all"
            onAction={() => router.navigate('/records')}
            index={2}>
            <View style={styles.grid}>
              {readings.map((reading) => (
                <VitalCard key={reading.id} reading={reading} />
              ))}
            </View>
          </Section>

          <Section index={3}>
            <EkaayInsightCard
              insight={insight}
              primaryLabel="Book HbA1c"
              onPrimary={() => router.navigate('/care/pods')}
              secondaryLabel="Ask why"
              onSecondary={() => askEkaay('Why is my fasting sugar rising?')}
              onTalkToDoctor={findGeneralPhysician}
            />
          </Section>

          <FamilyStrip index={4} />

          <Section title="Safety" index={5}>
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
        {/* The page colour below the last section too, for the bounce at the bottom on iOS. */}
        {Platform.OS === 'web' ? null : <View style={styles.bounce} />}
      </ScrollView>

      {/* Content fades out under the status bar instead of running into the clock. */}
      <LinearGradient
        colors={['rgba(248, 245, 240, 0.94)', 'rgba(248, 245, 240, 0)']}
        style={[styles.scrim, { height: insets.top + Spacing.two }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  light: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  scroll: {
    flex: 1,
    backgroundColor: GLOW_TOP,
  },
  page: {
    flexGrow: 1,
    backgroundColor: Colors.canvas,
  },
  bounce: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: Colors.canvas,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four + 4,
    paddingHorizontal: GUTTER,
  },
  top: {
    gap: Spacing.four - 4,
  },
  services: {
    marginTop: -Spacing.two,
    marginBottom: -Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three - 4,
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
  scrim: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
