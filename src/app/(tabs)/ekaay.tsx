import { router, useLocalSearchParams } from 'expo-router';
import { Info, SendHorizontal, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { glassSurface } from '@/components/ui/glass';
import { PageBackground } from '@/components/ui/morning-light';
import { Colors, Fonts, Glass, Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { greeting, suggestedQuestions, type ChatMessage } from '@/features/ekaay/chat';
import { ekaayApi } from '@/features/ekaay/ekaay-api';
import { MessageBubble } from '@/features/ekaay/message-bubble';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';
import { ApiError } from '@/services/api';

/** Ekaay's mark in the header, as big as Home's profile and bell buttons. */
const MARK = 46;
const SEND = 42;

export default function EkaayScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  /** The chat as of the last render, for the history sent with each question. */
  const messagesRef = useRef(messages);
  /** Set at once on sending, so a second tap before the next render can't ask twice. */
  const askingRef = useRef(false);
  /** A question tapped on Home or a record, e.g. `/ekaay?q=Explain my last report`. */
  const { q } = useLocalSearchParams<{ q?: string }>();

  const keyboardVisible = useKeyboardVisible();
  const clearance = useTabBarClearance();
  const insets = useSafeAreaInsets();
  const canSend = draft.trim().length > 0 && !asking;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /** Shows the question with a waiting answer, then swaps in Ekaay's reply, or why there isn't one. */
  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || askingRef.current) return;
    askingRef.current = true;
    setAsking(true);

    const stamp = Date.now();
    const asked: ChatMessage = { id: `u${stamp}`, from: 'user', text: question };
    const answerId = `e${stamp}`;
    const history = [...messagesRef.current.filter((message) => !message.local), asked];
    setMessages((current) => [
      ...current,
      asked,
      { id: answerId, from: 'ekaay', text: 'Reading your records\u2026', pending: true, local: true },
    ]);
    setDraft('');

    let reply: ChatMessage;
    try {
      reply = { id: answerId, from: 'ekaay', ...(await ekaayApi.ask(history)) };
    } catch (error) {
      const text =
        error instanceof ApiError ? error.message : 'Something went wrong. Try again in a moment.';
      reply = { id: answerId, from: 'ekaay', text, local: true };
    } finally {
      askingRef.current = false;
      setAsking(false);
    }
    setMessages((current) => current.map((message) => (message.id === answerId ? reply : message)));
  }, []);

  // Ask a question from Home once; the param is then cleared so it can be tapped again later.
  useEffect(() => {
    const question = q?.trim();
    if (!question) return;
    router.setParams({ q: undefined });
    void send(question);
  }, [q, send]);

  return (
    <View style={styles.container}>
      {/* The page stands still behind the header and the chat; only the messages scroll. */}
      <PageBackground />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        {/* The shadow sits on a wrapper, since the mark clips its own corners. */}
        <View style={styles.markShadow}>
          <EkaayMark size={MARK} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title} accessibilityRole="header">
              Ekaay
            </ThemedText>
            <View style={styles.aiTag}>
              <ThemedText style={styles.aiTagText}>AI</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.subtitle} numberOfLines={1}>
            Answers from your own records
          </ThemedText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.messages}>
          {/* A quiet line at the top of the chat, like Home's note under Ekaay's insight. */}
          <View style={styles.notice}>
            <Info size={13} color={Colors.textFaint} strokeWidth={2.2} />
            <ThemedText style={styles.noticeText}>
              Ekaay gives health information, not a diagnosis. In an emergency, call 112.
            </ThemedText>
          </View>

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: keyboardVisible ? Spacing.two : clearance + Spacing.two },
          ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestions}
            contentContainerStyle={styles.suggestionsContent}>
            {suggestedQuestions.map((question) => (
              <Pressable
                key={question}
                onPress={() => void send(question)}
                disabled={asking}
                accessibilityRole="button"
                accessibilityLabel={`Ask: ${question}`}
                style={({ pressed }) => [
                  glassSurface.small,
                  styles.suggestion,
                  pressed && styles.suggestionPressed,
                ]}>
                <Sparkles size={13} color={Colors.primary} strokeWidth={2.4} />
                <ThemedText style={styles.suggestionText} numberOfLines={1}>
                  {question}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[glassSurface.small, styles.composer]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Ekaay anything"
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.primary}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => void send(draft)}
              accessibilityLabel="Ask Ekaay"
              style={styles.input}
            />
            <Pressable
              onPress={() => void send(draft)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send"
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
      </KeyboardAvoidingView>
    </View>
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
  // Home's header row: a round lead, a big name with a quiet line under it.
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingHorizontal: Gutter,
    paddingBottom: Spacing.three - 4,
  },
  markShadow: {
    borderRadius: MARK / 2,
    boxShadow: Glass.shadowSmall,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  // As on Home's "Ekaay noticed" card: a small hairline tag, not a badge.
  aiTag: {
    marginTop: 3,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Glass.hairline,
  },
  aiTagText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.4,
    color: Colors.textFaint,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textSoft,
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
    marginBottom: Spacing.one,
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
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingTop: 2,
  },
  suggestions: {
    flexGrow: 0,
  },
  // Inside the gutters. The row clips, so the space above the pills and the gap down to the
  // composer are its own padding, which leaves room for the pills' lift.
  suggestionsContent: {
    gap: Spacing.two,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three - 4,
  },
  // Pills of glass, like Home's round buttons.
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
  },
  suggestionPressed: {
    backgroundColor: Colors.well,
    transform: [{ scale: 0.97 }],
  },
  suggestionText: {
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
  // A long pill of glass; the send button is its one orange.
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Gutter,
    paddingLeft: Spacing.four - 4,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  input: {
    flex: 1,
    minWidth: 0,
    outlineStyle: 'solid',
    outlineWidth: 0,
    paddingVertical: 9,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 15,
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
