import { router, useFocusEffect } from 'expo-router';
import { Headset, MessageSquarePlus, MessagesSquare } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { ListCard } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { SkeletonList } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { newChat, SupportChatRow } from '@/features/support/support-card';
import { confirmEndChat, endSupportChat, useSupportChats } from '@/features/support/use-support';

const back = () => (router.canGoBack() ? router.back() : router.replace('/care'));

/**
 * Help & support: start a chat with the HealthMatrix team, carry on the open one, or read the
 * past ones again. The team answers from the admin; replies land in the chat.
 */
export default function SupportScreen() {
  const memberId = useAuth().member?.id;
  const { chats, open, past, error, refresh } = useSupportChats();
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // A reply, or the team ending a chat, can happen while the member is elsewhere.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  /** One chat at a time: starting another ends the open one first. */
  const start = async () => {
    setStartError(null);
    if (open && memberId) {
      if (!(await confirmEndChat('Your current chat ends, and a new one starts.'))) return;
      setBusy(true);
      try {
        await endSupportChat(memberId, open.id);
      } catch (e) {
        setStartError(e instanceof Error ? e.message : 'Could not end your chat');
        return;
      } finally {
        setBusy(false);
      }
    }
    newChat();
  };

  return (
    <Screen
      onBack={back}
      backLabel="Care"
      title="Help & support"
      subtitle="Chat with the HealthMatrix team"
      onRefresh={refresh}>
      <Section index={0}>
        <Surface style={styles.intro}>
          <View style={styles.introTop}>
            <IconTile icon={Headset} size={48} />
            <View style={styles.introWords}>
              <ThemedText style={styles.introTitle}>How can we help?</ThemedText>
              <ThemedText style={styles.introBody}>
                Tell us what’s going on and a member of our team replies right here. You can leave
                the chat; replies wait for you on the Care tab.
              </ThemedText>
            </View>
          </View>
          <Button
            label={open ? 'Start a new chat' : 'Start a chat'}
            icon={MessageSquarePlus}
            variant={open ? 'secondary' : 'primary'}
            loading={busy}
            onPress={() => void start()}
            shadow={false}
          />
          {startError ? <ThemedText style={styles.error}>{startError}</ThemedText> : null}
        </Surface>
      </Section>

      {open ? (
        <Section title="Current chat" index={1}>
          <ListCard>
            <SupportChatRow chat={open} />
          </ListCard>
        </Section>
      ) : null}

      <Section title="Past conversations" index={2}>
        {chats === null ? (
          error ? (
            <ErrorState
              card
              title="Couldn’t load your chats"
              message={error}
              onRetry={() => void refresh()}
            />
          ) : (
            <SkeletonList rows={2} leading="tile" trailing={false} label="Loading your chats" />
          )
        ) : past?.length ? (
          <ListCard>
            {past.map((chat) => (
              <SupportChatRow key={chat.id} chat={chat} />
            ))}
          </ListCard>
        ) : (
          <EmptyState
            card
            icon={MessagesSquare}
            tone="neutral"
            title="No past chats yet"
            body="Chats you or the team end show up here, so you can read them again."
          />
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: Spacing.three,
  },
  introTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 2,
  },
  introWords: {
    flex: 1,
    gap: 4,
  },
  introTitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 19,
    lineHeight: 24,
    color: Colors.text,
  },
  introBody: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  error: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
});
