import { router, useLocalSearchParams } from 'expo-router';
import {
  CircleCheck,
  CornerDownRight,
  Info,
  MessageSquarePlus,
  SendHorizontal,
} from 'lucide-react-native';
import { Fragment, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/empty-state';
import { glassSurface } from '@/components/ui/glass';
import { PageBackground } from '@/components/ui/morning-light';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { HeaderIconButton, StackHeader } from '@/components/ui/stack-header';
import { Colors, Fonts, Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { messageDay, messageTime } from '@/features/support/format';
import { SupportBubble, type Delivery } from '@/features/support/support-bubble';
import { SUPPORT_TOPICS, TOPIC_ORDER } from '@/features/support/topics';
import { type SupportMessage, type SupportTopic } from '@/features/support/types';
import {
  confirmEndChat,
  startSupportChat,
  useSupportChat,
  type PendingMessage,
} from '@/features/support/use-support';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

const SEND = 42;
const TEXT_MAX = 2000;

const back = () => (router.canGoBack() ? router.back() : router.replace('/care/support'));
const startAnother = () =>
  router.replace({ pathname: '/care/support/[id]', params: { id: 'new' } });

/**
 * A chat with the support team. `new` starts one: the team's greeting, the topics to pick from,
 * and the first message, which files it for the team. An open chat checks for replies every few
 * seconds while it's on screen; an ended one reads as a transcript with a way to start another.
 */
export default function SupportChatScreen() {
  const { id: param } = useLocalSearchParams<{ id: string }>();
  const isNew = param === 'new';
  const member = useAuth().member;
  const { chat, error, pending, send, end, reload } = useSupportChat(isNew ? null : param);
  const keyboardVisible = useKeyboardVisible();
  const clearance = useTabBarClearance();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);

  const [topic, setTopic] = useState<SupportTopic | null>(null);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  const ended = chat?.status === 'ended';
  const loading = !isNew && !chat;
  const canSend = draft.trim().length > 0 && !starting && !ended && !loading;
  const firstName = member?.name.split(' ')[0];
  const [openedAt] = useState(() => new Date().toISOString());

  const submit = async () => {
    const text = draft.trim();
    if (!text || !canSend) return;
    setProblem(null);
    if (isNew) {
      if (!member) return;
      setStarting(true);
      try {
        const started = await startSupportChat(member.id, topic ?? 'other', text);
        setDraft('');
        router.replace({ pathname: '/care/support/[id]', params: { id: started.id } });
      } catch (e) {
        setProblem(e instanceof Error ? e.message : 'Could not start the chat. Try again.');
      } finally {
        setStarting(false);
      }
      return;
    }
    setDraft('');
    const failed = await send(text);
    if (failed) {
      setProblem(failed);
      setDraft((current) => current || text);
    }
  };

  const endChat = async () => {
    if (!(await confirmEndChat())) return;
    setProblem(null);
    setEnding(true);
    try {
      await end();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not end the chat. Try again.');
    } finally {
      setEnding(false);
    }
  };

  const title = isNew ? 'New chat' : chat ? SUPPORT_TOPICS[chat.topic].label : 'Support';
  const messages: (SupportMessage | PendingMessage)[] = [...(chat?.messages ?? []), ...pending];
  // The team's greeting opens every chat; it isn't stored, so it never shows as a reply.
  const greeting: SupportMessage = {
    id: 'greeting',
    from: 'support',
    text: `Hi${firstName ? ` ${firstName}` : ''}, how can we help? Tell us what’s going on and we’ll reply right here.`,
    at: chat?.createdAt ?? openedAt,
  };
  const lines = [greeting, ...messages];
  const lastMine = messages.filter((message) => message.from === 'member').at(-1);
  const deliveryOf = (message: SupportMessage | PendingMessage): Delivery | undefined => {
    if (message !== lastMine) return undefined;
    if ('pending' in message) return 'sending';
    return chat?.seenAt && chat.seenAt >= message.at ? 'seen' : 'sent';
  };
  const waitingOnTeam = !!chat && !ended && !chat.messages.some((m) => m.from === 'support');

  return (
    <View style={styles.container}>
      <PageBackground />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <StackHeader
          onBack={back}
          backLabel="Help & support"
          title={title}
          right={
            chat?.status === 'open' ? (
              <HeaderIconButton
                icon={<CircleCheck size={17} color={Colors.text} strokeWidth={2.3} />}
                label="End this chat"
                text={ending ? 'Ending…' : 'End'}
                onPress={ending ? undefined : () => void endChat()}
              />
            ) : undefined
          }
        />

        {/* Android draws edge to edge, so the window doesn't shrink for the keyboard: the chat does. */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {loading && error ? (
            <View style={styles.center}>
              <ErrorState card title="Couldn’t open this chat" message={error} onRetry={() => void reload()} />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              // A new chat reads from the top; a running one keeps its latest line in view.
              onContentSizeChange={() =>
                isNew ? undefined : scrollRef.current?.scrollToEnd({ animated: true })
              }
              contentContainerStyle={styles.messages}>
              <View style={styles.notice}>
                <Info size={13} color={Colors.textFaint} strokeWidth={2.2} />
                <ThemedText style={styles.noticeText}>
                  {chat
                    ? `Chat #${chat.reference} · started ${messageDay(chat.createdAt).toLowerCase()}`
                    : 'For a medical emergency, call 112.'}
                </ThemedText>
              </View>

              {lines.map((message, i) => {
                const previous = lines[i - 1];
                const newDay = !previous || messageDay(previous.at) !== messageDay(message.at);
                const first =
                  newDay || !previous || previous.from !== 'support' || message.from !== 'support';
                return (
                  <Fragment key={message.id}>
                    {newDay ? <DayLine label={messageDay(message.at)} /> : null}
                    <SupportBubble message={message} first={first} delivery={deliveryOf(message)} />
                  </Fragment>
                );
              })}

              {loading ? <ChatSkeleton /> : null}

              {isNew ? (
                <View style={styles.topics}>
                  <ThemedText style={styles.topicsLabel}>What’s it about?</ThemedText>
                  <View style={styles.chips}>
                    {TOPIC_ORDER.map((key) => (
                      <Chip
                        key={key}
                        label={SUPPORT_TOPICS[key].label}
                        icon={SUPPORT_TOPICS[key].icon}
                        selected={topic === key}
                        onPress={() => setTopic((current) => (current === key ? null : key))}
                      />
                    ))}
                  </View>

                  {topic ? (
                    // Ways to start for the picked topic: a tap puts the words in the message box.
                    <View style={styles.starters}>
                      <ThemedText style={styles.topicsLabel}>Start with</ThemedText>
                      {SUPPORT_TOPICS[topic].starters.map((starter) => (
                        <Pressable
                          key={starter}
                          onPress={() => {
                            setDraft(starter);
                            inputRef.current?.focus();
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Write: ${starter}`}
                          style={({ pressed }) => [
                            glassSurface.small,
                            styles.starter,
                            pressed && styles.starterPressed,
                          ]}>
                          <CornerDownRight size={15} color={Colors.primaryDeep} strokeWidth={2.4} />
                          <ThemedText style={styles.starterText}>{starter}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {waitingOnTeam ? (
                <ThemedText style={styles.waiting}>
                  Thanks, the team has your message. You can leave this screen; their reply will
                  wait for you on the Care tab.
                </ThemedText>
              ) : null}

              {ended ? (
                <View style={styles.endedBox}>
                  <View style={styles.endedLine}>
                    <CircleCheck size={14} color={Colors.textFaint} strokeWidth={2.4} />
                    <ThemedText style={styles.endedText}>
                      {chat?.endedBy === 'support' ? 'Support ended this chat' : 'You ended this chat'}
                      {chat?.endedAt
                        ? ` · ${messageDay(chat.endedAt)}, ${messageTime(chat.endedAt)}`
                        : ''}
                    </ThemedText>
                  </View>
                  <Button
                    label="Start a new chat"
                    icon={MessageSquarePlus}
                    variant="secondary"
                    size="sm"
                    onPress={startAnother}
                  />
                </View>
              ) : null}
            </ScrollView>
          )}

          {ended || (loading && error) ? (
            <View style={{ height: keyboardVisible ? 0 : clearance }} />
          ) : (
            <View
              style={[
                styles.footer,
                { paddingBottom: keyboardVisible ? Spacing.two : clearance + Spacing.two },
              ]}>
              {problem ? (
                <ThemedText style={styles.problem} accessibilityLiveRegion="polite">
                  {problem}
                </ThemedText>
              ) : null}
              <View style={[glassSurface.small, styles.composer]}>
                <TextInput
                  ref={inputRef}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={isNew ? 'Describe your question or problem' : 'Write a message'}
                  placeholderTextColor={Colors.textMuted}
                  selectionColor={Colors.primary}
                  multiline
                  // A textarea starts two rows tall on web; on phones it starts at one and grows.
                  numberOfLines={Platform.OS === 'web' ? 1 : undefined}
                  maxLength={TEXT_MAX}
                  editable={!loading && !starting}
                  accessibilityLabel="Message to support"
                  style={styles.input}
                />
                <Pressable
                  onPress={() => void submit()}
                  disabled={!canSend}
                  accessibilityRole="button"
                  accessibilityLabel={isNew ? 'Start the chat' : 'Send'}
                  accessibilityState={{ disabled: !canSend }}
                  style={({ pressed }) => [
                    styles.send,
                    !canSend && styles.sendDisabled,
                    pressed && styles.sendPressed,
                  ]}>
                  <SendHorizontal
                    size={18}
                    color={canSend ? Colors.onInk : Colors.textFaint}
                    strokeWidth={2.4}
                  />
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** "Today", "Yesterday", "Sat, 10 Oct" between the days of a chat. */
function DayLine({ label }: { label: string }) {
  return (
    <View style={styles.dayLine} accessibilityRole="header">
      <View style={styles.dayRule} />
      <ThemedText style={styles.dayText}>{label}</ThemedText>
      <View style={styles.dayRule} />
    </View>
  );
}

/** The chat's lines while it loads: a reply at the left, one of the member's at the right. */
function ChatSkeleton() {
  return (
    <SkeletonGroup label="Loading the chat" style={styles.skeleton}>
      <Skeleton width="62%" height={56} radius={20} style={styles.skeletonMine} />
      <Skeleton width="70%" height={72} radius={20} style={styles.skeletonTheirs} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  // No fill of its own: the page's light shows behind the header, the chat and the composer.
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Gutter,
  },
  messages: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three - 2,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
  },
  noticeText: {
    flexShrink: 1,
    marginTop: -2,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  topics: {
    gap: Spacing.two,
    paddingLeft: 28 + Spacing.two,
  },
  topicsLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  starters: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  // A ready-made first line: a pill of glass whose arrow carries the orange.
  starter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    maxWidth: '100%',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
  },
  starterPressed: {
    backgroundColor: Colors.well,
    transform: [{ scale: 0.98 }],
  },
  starterText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.text,
  },
  dayLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginVertical: 2,
  },
  dayRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
  },
  dayText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  waiting: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  endedBox: {
    alignItems: 'center',
    gap: Spacing.three - 4,
    marginTop: Spacing.two,
  },
  endedLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  endedText: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  skeleton: {
    gap: Spacing.three - 2,
  },
  skeletonMine: {
    alignSelf: 'flex-end',
  },
  skeletonTheirs: {
    marginLeft: 28 + Spacing.two,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  problem: {
    marginHorizontal: Gutter + 4,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
  // A long pill of glass, as in Ekaay's chat; the send button is its one orange.
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginHorizontal: Gutter,
    paddingLeft: Spacing.four - 4,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: Radius.xl,
  },
  input: {
    flex: 1,
    minWidth: 0,
    maxHeight: 120,
    outlineStyle: 'solid',
    outlineWidth: 0,
    paddingTop: 10,
    paddingBottom: 10,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 21,
  },
  send: {
    width: SEND,
    height: SEND,
    borderRadius: SEND / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBright,
  },
  sendPressed: {
    backgroundColor: Colors.primaryDeep,
    transform: [{ scale: 0.95 }],
  },
  // Nothing to send yet: a quiet see-through grey, as Button does, not a faded disc of orange.
  sendDisabled: {
    backgroundColor: Colors.backgroundSelected,
  },
});
