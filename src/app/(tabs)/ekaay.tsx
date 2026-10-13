import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Info, Mic, SendHorizontal, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
import { PageBackground } from '@/components/ui/morning-light';
import {
  Colors,
  Fonts,
  Gradients,
  Gutter,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { MessageBubble } from '@/features/ekaay/message-bubble';
import {
  notConnectedReply,
  sampleConversation,
  suggestedQuestions,
  type ChatMessage,
} from '@/features/ekaay/sample-data';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

// STUB: Ekaay is not connected yet, so every question gets the same honest reply.
function exchange(question: string): ChatMessage[] {
  const stamp = Date.now();
  return [
    { id: `u${stamp}`, from: 'user', text: question },
    { id: `e${stamp}`, from: 'ekaay', text: notConnectedReply },
  ];
}

/** Ekaay's mark in the header, as big as Home's profile and bell buttons. */
const MARK = 46;
const SEND = 42;

export default function EkaayScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(sampleConversation);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  /** A question tapped on Home, e.g. `/ekaay?q=Explain my last report`. */
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [askedQ, setAskedQ] = useState<string | undefined>(undefined);

  const keyboardVisible = useKeyboardVisible();
  const clearance = useTabBarClearance();
  const insets = useSafeAreaInsets();
  const canSend = draft.trim().length > 0;

  // Ask a question from Home once; the param is then cleared so it can be tapped again later.
  if (q !== askedQ) {
    setAskedQ(q);
    const question = q?.trim();
    if (question) setMessages((current) => [...current, ...exchange(question)]);
  }
  useEffect(() => {
    if (q) router.setParams({ q: undefined });
  }, [q]);

  const send = (text: string) => {
    const question = text.trim();
    if (!question) return;
    setMessages((current) => [...current, ...exchange(question)]);
    setDraft('');
  };

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
                onPress={() => send(question)}
                accessibilityRole="button"
                accessibilityLabel={`Ask: ${question}`}
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}>
                <Sparkles size={13} color={Colors.primary} strokeWidth={2.4} />
                <ThemedText style={styles.suggestionText} numberOfLines={1}>
                  {question}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Ekaay anything"
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.primary}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => send(draft)}
              accessibilityLabel="Ask Ekaay"
              style={styles.input}
            />
            {/* A quiet dish, so the send button stays the one coloured thing in the bar. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Speak"
              hitSlop={8}
              style={({ pressed }) => [styles.mic, pressed && styles.pressed]}>
              <LinearGradient
                colors={Gradients.dishQuiet}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, styles.center]}>
                <Mic size={18} color={Colors.textSoft} strokeWidth={2.2} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => send(draft)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !canSend }}
              style={({ pressed }) => [
                styles.send,
                !canSend && styles.sendDisabled,
                pressed && styles.sendPressed,
              ]}>
              <SendHorizontal size={18} color={Colors.onInk} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
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
    boxShadow: Shadows.dish,
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
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
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
    gap: Spacing.two + 2,
    paddingTop: Spacing.two,
  },
  suggestions: {
    flexGrow: 0,
  },
  // Inside the gutters, with room for the pills' shadows.
  suggestionsContent: {
    gap: Spacing.two,
    paddingHorizontal: Gutter,
    paddingVertical: 2,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
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
  // The one raised thing on the screen.
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Gutter,
    paddingLeft: Spacing.four - 4,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.raised,
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
  mic: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  // The icon's own layer, so it paints above the dish's gradient on web.
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
  sendDisabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});
