import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Mic, SendHorizontal, ShieldCheck, Sparkles } from 'lucide-react-native';
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
import { HeroBackground } from '@/components/ui/hero-background';
import { Colors, Fonts, Gradients, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
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
  // Light status bar text over the dark header, only while Ekaay is showing.
  const focused = useIsFocused();
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
      {focused ? <StatusBar style="light" /> : null}
      {/* Ekaay on the same dark header as the other tabs. */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <HeroBackground />
        <View style={styles.headerRow}>
          <View>
            <LinearGradient
              colors={Gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}>
              <Sparkles size={22} color={Colors.onInk} strokeWidth={2.2} />
            </LinearGradient>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.flex}>
            <ThemedText style={styles.title}>Ekaay</ThemedText>
            <ThemedText type="caption" style={styles.subtitle}>
              Answers from your own records
            </ThemedText>
          </View>
          <View style={styles.aiPill}>
            <ThemedText style={styles.aiText}>AI</ThemedText>
          </View>
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
          <View style={styles.notice}>
            <ShieldCheck size={15} color={Colors.success} strokeWidth={2.4} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
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
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                <Sparkles size={13} color={Colors.primary} strokeWidth={2.4} />
                <ThemedText type="small" style={styles.suggestionText}>
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
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => send(draft)}
              accessibilityLabel="Ask Ekaay"
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Speak"
              hitSlop={8}
              style={({ pressed }) => [styles.mic, pressed && styles.pressed]}>
              <Mic size={19} color={Colors.textSecondary} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              onPress={() => send(draft)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send"
              style={({ pressed }) => [
                styles.send,
                !canSend && styles.sendDisabled,
                pressed && styles.pressed,
              ]}>
              <SendHorizontal size={18} color={Colors.onInk} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Lifted brand green, for the online dot. */
const ONLINE = '#22C55E';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingBottom: Spacing.three + 4,
    backgroundColor: Colors.background,
  },
  headerRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    backgroundColor: ONLINE,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onInk,
  },
  subtitle: {
    color: Colors.onInkMuted,
  },
  aiPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  aiText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.primaryLight,
  },
  messages: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three - 2,
    padding: Spacing.three,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 128, 109, 0.16)',
    backgroundColor: Colors.successSoft,
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
  suggestionsContent: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(221, 67, 1, 0.16)',
    backgroundColor: Colors.primarySoft,
  },
  suggestionText: {
    fontFamily: Fonts.semibold,
    color: Colors.primary,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    paddingLeft: Spacing.three + 2,
    paddingRight: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.lifted,
  },
  input: {
    flex: 1,
    minWidth: 0,
    outlineStyle: 'solid',
    outlineWidth: 0,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 15,
  },
  mic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    boxShadow: Shadows.glow,
  },
  sendDisabled: {
    opacity: 0.4,
    boxShadow: 'none',
  },
  pressed: {
    opacity: 0.75,
  },
});
