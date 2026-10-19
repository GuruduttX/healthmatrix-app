import { Check } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Glass, Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

import { EKAAY_LANGUAGES, type EkaayLanguage } from './languages';

const CHOICES: { code: EkaayLanguage | null; label: string; hint: string }[] = [
  { code: null, label: 'Auto', hint: 'The language you ask in' },
  ...(Object.entries(EKAAY_LANGUAGES) as [EkaayLanguage, { name: string; label: string }][]).map(
    ([code, { name, label }]) => ({ code, label, hint: name }),
  ),
];

/** Picks the language Ekaay answers, hears and speaks in, from a sheet over the chat. */
export function LanguageSheet({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: EkaayLanguage | null;
  onChange: (language: EkaayLanguage | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.grabber} />
          <ThemedText style={styles.title} accessibilityRole="header">
            Ekaay’s language
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Ekaay answers, listens and speaks in this language. On Auto it answers in whatever
            language you ask in.
          </ThemedText>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {CHOICES.map(({ code, label, hint }, index) => {
              const selected = code === value;
              return (
                <Pressable
                  key={code ?? 'auto'}
                  onPress={() => {
                    onChange(code);
                    onClose();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={code ? `${label}, ${hint}` : `${label}: ${hint}`}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && styles.divided,
                    pressed && styles.rowPressed,
                  ]}>
                  <View style={styles.flex}>
                    <ThemedText style={styles.label}>{label}</ThemedText>
                    {hint !== label ? <ThemedText style={styles.hint}>{hint}</ThemedText> : null}
                  </View>
                  {selected ? <Check size={20} color={Colors.primaryDeep} strokeWidth={2.6} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 42, 51, 0.28)',
  },
  // Solid warm white: the sheet covers the chat, so there is no light behind it to show through.
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '78%',
    alignSelf: 'center',
    paddingTop: Spacing.two,
    paddingHorizontal: Gutter,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Glass.page,
    boxShadow: Glass.shadow,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    marginBottom: Spacing.three,
    backgroundColor: Colors.hairline,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 21,
    lineHeight: 27,
    color: Colors.text,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: Spacing.two,
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  list: {
    flexGrow: 0,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 11,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Glass.hairline,
  },
  rowPressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.text,
  },
  hint: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
