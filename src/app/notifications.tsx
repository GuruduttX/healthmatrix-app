import { router } from 'expo-router';
import { BellRing, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Colors, Spacing } from '@/constants/theme';
import { type Notice, useNotifications } from '@/features/notifications/use-notifications';

/** One notice: what it is, a line of detail, when, and where tapping goes. */
function NoticeRow({ notice, first }: { notice: Notice; first: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(notice.href)}
      accessibilityRole="button"
      accessibilityLabel={`${notice.title}. ${notice.body}${notice.when ? `. ${notice.when}` : ''}`}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}>
      <IconTile icon={notice.icon} tone={notice.tone} size={42} />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
            {notice.title}
          </ThemedText>
          {notice.when ? (
            <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
              {notice.when}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
          {notice.body}
        </ThemedText>
      </View>
      <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.2} />
    </Pressable>
  );
}

function NoticeSection({ title, notices }: { title: string; notices: Notice[] }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} meta={`${notices.length}`} />
      <Surface style={styles.list}>
        {notices.map((notice, index) => (
          <NoticeRow key={notice.id} notice={notice} first={index === 0} />
        ))}
      </Surface>
    </View>
  );
}

/**
 * Notifications, opened from the bell on Home: consults starting or cancelled, answers to
 * custom-time requests, doses due or missed today, and vaccine doses due.
 */
export default function NotificationsScreen() {
  const { notices, refresh } = useNotifications();
  const urgent = notices?.filter((notice) => notice.urgent) ?? [];
  const updates = notices?.filter((notice) => !notice.urgent) ?? [];

  return (
    <Screen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      backLabel="Home"
      barTitle="Notifications"
      onRefresh={refresh}>
      <View style={styles.stack}>
        {!notices ? (
          <SkeletonList rows={4} leading="tile" trailing={false} label="Loading your notifications" />
        ) : !notices.length ? (
          <EmptyState
            icon={BellRing}
            tone="success"
            title="You’re all caught up"
            body="Medicine reminders, consult updates and vaccine doses will show up here."
          />
        ) : (
          <>
            {urgent.length ? <NoticeSection title="Needs attention" notices={urgent} /> : null}
            {updates.length ? <NoticeSection title="Updates" notices={updates} /> : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.three - 4,
  },
  list: {
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
});
