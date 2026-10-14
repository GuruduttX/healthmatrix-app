import { router } from 'expo-router';
import { BellRing, CheckCheck } from 'lucide-react-native';
import { Alert, Platform, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, LIST_LEAD, ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { SkeletonList } from '@/components/ui/skeleton';
import { HeaderIconButton } from '@/components/ui/stack-header';
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

/** Asks before clearing: an urgent one (a consult starting, a dose due) won't come back. */
function confirmClear(count: number) {
  const message = `${count === 1 ? 'It' : `All ${count}`} will go from here and from the bell. New notifications still show.`;
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`Clear notifications?\n\n${message}`) ?? false);
  }
  return new Promise<boolean>((resolve) =>
    Alert.alert('Clear notifications?', message, [
      { text: 'Keep them', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Clear', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/**
 * Notifications, opened from the bell on Home: consults starting or cancelled, answers to
 * custom-time requests, doses due or missed today, and vaccine doses due. Clear hides the ones
 * showing now; a later stage of the same thing, or tomorrow's dose, still shows.
 */
export default function NotificationsScreen() {
  const { notices, refresh, clear } = useNotifications();
  const urgent = notices?.filter((notice) => notice.urgent) ?? [];
  const updates = notices?.filter((notice) => !notice.urgent) ?? [];

  return (
    <Screen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      backLabel="Home"
      barTitle="Notifications"
      barRight={
        notices?.length ? (
          <HeaderIconButton
            icon={<CheckCheck size={16} color={Colors.text} strokeWidth={2.4} />}
            text="Clear"
            label="Clear all notifications"
            onPress={async () => {
              if (await confirmClear(notices.length)) void clear();
            }}
          />
        ) : undefined
      }
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
