import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Info, Languages, Mic, SendHorizontal, Sparkles, Square, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { LanguageSheet } from '@/features/ekaay/language-sheet';
import { EKAAY_LANGUAGES, type EkaayLanguage } from '@/features/ekaay/languages';
import { MessageBubble } from '@/features/ekaay/message-bubble';
import { QUESTION_MAX_MS, useAnswerVoice, useVoiceQuestion } from '@/features/ekaay/voice';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';
import { ApiError } from '@/services/api';

/** Ekaay's mark in the header, as big as Home's profile and bell buttons. */
const MARK = 46;
const SEND = 42;

/** 0:07 */
const clock = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function EkaayScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  /** The language picked for Ekaay; null is Auto, the language of each question. */
  const [language, setLanguage] = useState<EkaayLanguage | null>(null);
  const [picking, setPicking] = useState(false);
  /** Whether Gemini can hear questions and speak answers; until we know, the mic stays hidden. */
  const [gemini, setGemini] = useState(false);
  /** Gemini is turning a spoken question into words. */
  const [hearing, setHearing] = useState(false);
  /** Set at once, so the one-minute cut-off and a tap can't both send the question. */
  const hearingRef = useRef(false);
  const cutOffRef = useRef<ReturnType<typeof setTimeout>>(undefined);
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

  const answerVoice = useAnswerVoice(language, gemini);
  const question = useVoiceQuestion();
  const { play, stop: stopVoice } = answerVoice;
  const { cancel: cancelQuestion } = question;
  const busy = asking || hearing || question.isRecording;

  /** Asks the server whether Gemini is set up; true when Ekaay can hear and speak. */
  const checkVoice = useCallback(
    () =>
      ekaayApi
        .features()
        .then(({ voice }) => {
          setGemini(voice);
          return voice;
        })
        .catch(() => false),
    [],
  );

  // Checked each time the tab opens, so voice turns on once the server is set up for it.
  // Leaving the tab stops the voice and the mic; the tab stays mounted, so unmounting won't.
  useFocusEffect(
    useCallback(() => {
      void checkVoice();
      return () => {
        stopVoice();
        clearTimeout(cutOffRef.current);
        void cancelQuestion();
      };
    }, [checkVoice, stopVoice, cancelQuestion]),
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * Shows the question with a waiting answer, then swaps in Ekaay's reply, or why there isn't one.
   * A spoken question gets its answer read aloud too.
   */
  const send = useCallback(async (text: string, spoken = false) => {
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
      const answer = await ekaayApi.ask(history, language ?? undefined);
      reply = { id: answerId, from: 'ekaay', ...answer };
    } catch (error) {
      const text =
        error instanceof ApiError ? error.message : 'Something went wrong. Try again in a moment.';
      reply = { id: answerId, from: 'ekaay', text, local: true };
    } finally {
      askingRef.current = false;
      setAsking(false);
    }
    setMessages((current) => current.map((message) => (message.id === answerId ? reply : message)));
    if (spoken && !reply.local) void play(reply.id, reply.text);
  }, [language, play]);

  /** Stops listening, has Gemini write down what was said, and asks it. */
  const hear = useCallback(async () => {
    if (hearingRef.current) return;
    hearingRef.current = true;
    clearTimeout(cutOffRef.current);
    setHearing(true);
    try {
      const recording = await question.finish();
      if (!recording) return;
      const { audio, mimeType } = recording;
      const text = await ekaayApi.transcribe(audio, mimeType, language ?? undefined);
      setHearing(false);
      await send(text, true);
    } catch (error) {
      const text =
        error instanceof ApiError
          ? error.message
          : 'Ekaay couldn’t hear that. Try again, or type your question.';
      setMessages((current) => [...current, { id: `m${Date.now()}`, from: 'ekaay', text, local: true }]);
    } finally {
      hearingRef.current = false;
      setHearing(false);
    }
  }, [language, question, send]);

  /** Starts listening for a spoken question, quieting any answer being read. */
  const listen = useCallback(async () => {
    if (busy) return;
    stopVoice();
    // The mic is always there; without Gemini it says why instead of listening.
    if (!gemini && !(await checkVoice())) {
      setMessages((current) => [
        ...current,
        {
          id: `m${Date.now()}`,
          from: 'ekaay',
          text: 'Ekaay can’t listen yet: voice questions aren’t set up on HealthMatrix. Type your question for now.',
          local: true,
        },
      ]);
      return;
    }
    const started = await question.start().catch(() => false);
    // A question runs a minute at most; then Ekaay takes it as it is.
    if (started) cutOffRef.current = setTimeout(() => void hear(), QUESTION_MAX_MS);
    else {
      setMessages((current) => [
        ...current,
        {
          id: `m${Date.now()}`,
          from: 'ekaay',
          text: 'Ekaay needs your microphone to hear you. Allow it in Settings, or type your question.',
          local: true,
        },
      ]);
    }
  }, [busy, checkVoice, gemini, hear, question, stopVoice]);

  /** Stops listening without asking anything. */
  const cancelListening = useCallback(() => {
    clearTimeout(cutOffRef.current);
    void cancelQuestion();
  }, [cancelQuestion]);

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
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`Ekaay’s language: ${language ? EKAAY_LANGUAGES[language].name : 'Auto'}`}
          style={({ pressed }) => [glassSurface.small, styles.language, pressed && styles.suggestionPressed]}>
          <Languages size={15} color={Colors.text} strokeWidth={2.2} />
          <ThemedText style={styles.languageText} numberOfLines={1}>
            {language ? EKAAY_LANGUAGES[language].label : 'Auto'}
          </ThemedText>
        </Pressable>
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

          {messages.map((message) => {
            const readable = message.from === 'ekaay' && !message.pending && !message.local;
            const voice = answerVoice.voice?.id === message.id ? answerVoice.voice.state : null;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                voice={voice}
                onListen={
                  readable ? () => (voice ? stopVoice() : void play(message.id, message.text)) : undefined
                }
              />
            );
          })}
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
                disabled={busy}
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

          {question.isRecording || hearing ? (
            // Listening: the composer becomes a timer, a way out, and a button to ask.
            <View style={[glassSurface.small, styles.composer]} accessibilityLiveRegion="polite">
              <Pressable
                onPress={cancelListening}
                disabled={hearing}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                hitSlop={6}
                style={({ pressed }) => [styles.cancel, pressed && styles.sendPressed]}>
                <X size={18} color={Colors.textSoft} strokeWidth={2.4} />
              </Pressable>
              <View style={styles.listening}>
                {hearing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <View style={styles.recordingDot} />
                )}
                <ThemedText style={styles.listeningText} numberOfLines={1}>
                  {hearing ? 'Ekaay is listening…' : `Listening  ${clock(question.durationMillis)}`}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => void hear()}
                disabled={hearing}
                accessibilityRole="button"
                accessibilityLabel="Stop and ask"
                style={({ pressed }) => [
                  styles.send,
                  hearing && styles.sendDisabled,
                  pressed && styles.sendPressed,
                ]}>
                <Square
                  size={15}
                  color={hearing ? Colors.textFaint : Colors.onInk}
                  fill={hearing ? Colors.textFaint : Colors.onInk}
                  strokeWidth={2.4}
                />
              </Pressable>
            </View>
          ) : (
            <View style={[glassSurface.small, styles.composer]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask Ekaay, or tap the mic"
                placeholderTextColor={Colors.textMuted}
                selectionColor={Colors.primary}
                returnKeyType="send"
                submitBehavior="submit"
                onSubmitEditing={() => void send(draft)}
                accessibilityLabel="Ask Ekaay"
                style={styles.input}
              />
              {/* Speak or send, side by side: the mic is quiet glass, send is the one orange. */}
              <Pressable
                onPress={() => void listen()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Ask by voice"
                accessibilityState={{ disabled: busy }}
                style={({ pressed }) => [
                  styles.mic,
                  busy && styles.micDisabled,
                  pressed && styles.micPressed,
                ]}>
                <Mic size={19} color={busy ? Colors.textFaint : Colors.text} strokeWidth={2.3} />
              </Pressable>
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
          )}
        </View>
      </KeyboardAvoidingView>

      <LanguageSheet
        visible={picking}
        value={language}
        onChange={(next) => {
          stopVoice();
          setLanguage(next);
        }}
        onClose={() => setPicking(false)}
      />
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
  // The language in the header: a small pill of glass, like the suggestions.
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 120,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
  },
  languageText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
  cancel: {
    width: 32,
    height: 32,
    marginLeft: -8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listening: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 42,
  },
  // The one red in the chat: the mic is on. Crimson, as for anything urgent, never the orange.
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.high,
  },
  listeningText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
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
    width: SEND,
    height: SEND,
    borderRadius: SEND / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...glassSurface.flat,
  },
  micPressed: {
    backgroundColor: Colors.well,
    transform: [{ scale: 0.95 }],
  },
  micDisabled: {
    opacity: 0.6,
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
