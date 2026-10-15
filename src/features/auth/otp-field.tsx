import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Glass, Radius } from '@/constants/theme';

type OtpFieldProps = Omit<TextInputProps, 'value'> & {
  label: string;
  value: string;
  ref?: Ref<TextInput>;
};

/**
 * A one-time code as a row of boxes, one digit in each. Typing goes to a real text field laid
 * invisibly over the boxes, so pasting and the phone's code autofill work as usual.
 */
export function OtpField({
  ref,
  label,
  value,
  maxLength = 6,
  editable = true,
  onFocus,
  onBlur,
  ...input
}: OtpFieldProps) {
  const [focused, setFocused] = useState(false);
  // The box the next digit goes in; the last one once the code is complete.
  const active = Math.min(value.length, maxLength - 1);

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View>
        <View style={styles.boxes} aria-hidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: maxLength }, (_, i) => {
            const digit = value[i];
            const current = focused && i === active;
            return (
              <View
                key={i}
                style={[styles.box, current && styles.boxCurrent, !editable && styles.boxReadOnly]}>
                {digit ? (
                  <ThemedText style={styles.digit}>{digit}</ThemedText>
                ) : current ? (
                  <View style={styles.caret} />
                ) : null}
              </View>
            );
          })}
        </View>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          value={value}
          maxLength={maxLength}
          editable={editable}
          caretHidden
          selectionColor="transparent"
          {...input}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[StyleSheet.absoluteFill, styles.input]}
        />
      </View>
    </View>
  );
}

const BOX_HEIGHT = 54;

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  // TextField's label, so the two kinds of field read alike.
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  boxes: {
    flexDirection: 'row',
    gap: 8,
  },
  box: {
    flex: 1,
    height: BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md + 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    // TextField's frosted glass, so the boxes read as panes set into the form.
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    boxShadow: Glass.glowSmall,
  },
  // TextField's focus ring, on the box being typed in.
  boxCurrent: {
    borderColor: Colors.primary,
    boxShadow: '0 0 0 4px rgba(221, 67, 1, 0.12)',
  },
  boxReadOnly: {
    borderColor: Colors.hairline,
    backgroundColor: Colors.well,
  },
  digit: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  caret: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },
  // Invisible, but still the thing that is tapped, typed into and pasted into.
  input: {
    outlineStyle: 'solid',
    outlineWidth: 0,
    paddingHorizontal: 0,
    color: 'transparent',
    fontSize: 16,
    opacity: 0.02,
  },
});
