import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  /** Shown above the field, so it stays clear what to type once the placeholder is gone. */
  label?: string;
  /** Quiet help under the field. Replaced by `error` when there is one. */
  hint?: string;
  error?: string | null;
  /** Fixed text before the value, e.g. "+91". */
  prefix?: string;
  /** An icon or small button at the left or right inside the field. */
  leading?: ReactNode;
  trailing?: ReactNode;
  ref?: Ref<TextInput>;
};

/**
 * A labelled text input on the warm page: white, rounded, a warm outline, and ringed in orange
 * while it has focus. Pass `multiline` for notes.
 */
export function TextField({
  ref,
  label,
  hint,
  error,
  prefix,
  leading,
  trailing,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...input
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.box,
          input.multiline && styles.boxMultiline,
          focused && styles.focused,
          !!error && styles.invalid,
          !editable && styles.readOnly,
        ]}>
        {leading}
        {prefix ? (
          <ThemedText style={styles.prefix} accessibilityElementsHidden>
            {prefix}
          </ThemedText>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          editable={editable}
          {...input}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, input.multiline && styles.inputMultiline, style]}
        />
        {trailing}
      </View>
      {error ? (
        <ThemedText style={[styles.note, styles.error]}>{error}</ThemedText>
      ) : hint ? (
        <ThemedText style={styles.note}>{hint}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  note: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  error: {
    fontFamily: Fonts.semibold,
    color: Colors.high,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  boxMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  focused: {
    borderColor: Colors.primary,
    boxShadow: '0 0 0 4px rgba(221, 67, 1, 0.12)',
  },
  invalid: {
    borderColor: Colors.high,
  },
  readOnly: {
    borderColor: Colors.hairline,
    backgroundColor: Colors.well,
  },
  prefix: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.textSoft,
  },
  input: {
    flex: 1,
    minWidth: 0,
    // The box draws the focus ring; no second outline from the browser on web. A solid style
    // is needed too: the browser's default "auto" ring ignores the width.
    outlineStyle: 'solid',
    outlineWidth: 0,
    paddingVertical: 13,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
