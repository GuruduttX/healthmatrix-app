import { router } from 'expo-router';
import { BellRing } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, LIST_LEAD, ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { SkeletonList } from '@/components/ui/skeleton';
import { Colors, Fonts } from '@/constants/theme';
import { type Notice, useNotifications } from '@/features/notifications/use-notifications';

/** One notice: what it is, a line of detail, when, and where tapping goes. */
function NoticeRow({ notice }: { notice: Notice }) {
  return (
    <ListRow
      leading={<IconTile icon={notice.icon} tone={notice.tone} size={LIST_LEAD} />}
      title={notice.title}
      subtitle={notice.body}
      // When it is for, as a quiet line of its own, so the title keeps the row's width.
      meta={
        notice.when ? (
          <ThemedText style={styles.when} numberOfLines={1}>
            {notice.when}
          </ThemedText>
        ) : null
      }
      trailing={<Chevron />}
      onPress={() => router.push(notice.href)}
      accessibilityLabel={`${notice.title}. ${notice.body}${notice.when ? `. ${notice.when}` : ''}`}
    />
  );
}

function NoticeSection({
  title,
  notices,
  index,
}: {
  title: string;
  notices: Notice[];
  index: number;
}) {
  return (
    <Section title={title} meta={`${notices.length}`} index={index}>
      <ListCard>
        {notices.map((notice) => (
          <NoticeRow key={notice.id} notice={notice} />
        ))}
      </ListCard>
    </Section>
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
          {urgent.length ? (
            <NoticeSection title="Needs attention" notices={urgent} index={0} />
          ) : null}
          {updates.length ? (
            <NoticeSection title="Updates" notices={updates} index={urgent.length ? 1 : 0} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  when: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textFaint,
  },
});
