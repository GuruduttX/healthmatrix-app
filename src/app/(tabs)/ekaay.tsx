import { LinearGradient } from 'expo-linear-gradient';
import { Mic, SendHorizontal, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { MessageBubble } from '@/features/ekaay/message-bubble';
import {
  notConnectedReply,
  sampleConversation,
  suggestedQuestions,
  type ChatMessage,
} from '@/features/ekaay/sample-data';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

export default function EkaayScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(sampleConversation);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const keyboardVisible = useKeyboardVisible();
  const clearance = useTabBarClearance();
  const canSend = draft.trim().length > 0;

  // STUB: Ekaay is not connected yet, so every question gets the same honest reply.
  const send = (text: string) => {
    const question = text.trim();
    if (!question) return;
    const stamp = Date.now();
    setMessages((current) => [
      ...current,
      { id: `u${stamp}`, from: 'user', text: question },
      { id: `e${stamp}`, from: 'ekaay', text: notConnectedReply },
    ]);
    setDraft('');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <LinearGradient
              colors={[Colors.primaryMid, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}>
              <Sparkles size={20} color={Colors.onInk} strokeWidth={2.2} />
            </LinearGradient>
            <View style={styles.flex}>
              <ThemedText type="subtitle">Ekaay</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Answers from your own records
              </ThemedText>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={styles.messages}>
            <View style={styles.notice}>
              <ShieldCheck size={14} color={Colors.textSecondary} strokeWidth={2.2} />
              <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
                Ekaay gives health information, not a diagnosis. In an emergency, call 112.
              </ThemedText>
            </View>

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ScrollView>

          <View
            style={[styles.footer, { paddingBottom: keyboardVisible ? Spacing.two : clearance + Spacing.two }]}>
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
                  style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                  <ThemedText type="small" themeColor="textSecondary">
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
                style={styles.input}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Speak" hitSlop={8}>
                <Mic size={20} color={Colors.textSecondary} strokeWidth={2} />
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
                <SendHorizontal size={18} color={Colors.onInk} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: {
    gap: Spacing.two + 4,
    padding: Spacing.three,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundSelected,
  },
  footer: {
    gap: Spacing.two,
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
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    marginHorizontal: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 15,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.75,
  },
});
