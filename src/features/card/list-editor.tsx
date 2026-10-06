import { Plus, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { formStyles } from './form-styles';

type ListEditorProps = {
  items: string[];
  onChange: (items: string[]) => void;
  /** What is typed but not yet added. Kept by the screen so Save can include it. */
  draft: string;
  onDraftChange: (draft: string) => void;
  placeholder: string;
  /** Common entries, offered as one-tap adds. */
  suggestions?: string[];
  max?: number;
  editable?: boolean;
};

const has = (items: string[], value: string) =>
  items.some((item) => item.toLowerCase() === value.toLowerCase());

/** Adds `value` unless it is blank or already there. */
export function addItem(items: string[], value: string) {
  const trimmed = value.trim();
  return trimmed && !has(items, trimmed) ? [...items, trimmed] : items;
}

/** A short list of free-text entries, e.g. allergies, shown as removable pills. */
export function ListEditor({
  items,
  onChange,
  draft,
  onDraftChange,
  placeholder,
  suggestions = [],
  max = 20,
  editable = true,
}: ListEditorProps) {
  const full = items.length >= max;
  const offered = suggestions.filter((suggestion) => !has(items, suggestion));

  const add = (value: string) => {
    onChange(addItem(items, value));
    onDraftChange('');
  };

  return (
    <View style={styles.wrap}>
      {items.length ? (
        <View style={styles.pills}>
          {items.map((item) => (
            <View key={item} style={styles.pill}>
              <ThemedText type="smallBold" style={styles.pillText}>
                {item}
              </ThemedText>
              <Pressable
                onPress={() => onChange(items.filter((other) => other !== item))}
                disabled={!editable}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item}`}
                hitSlop={8}>
                <X size={14} color={Colors.textSecondary} strokeWidth={2.4} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {full ? null : (
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={onDraftChange}
            onSubmitEditing={() => add(draft)}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            maxLength={80}
            editable={editable}
            style={[formStyles.input, styles.input]}
          />
          <Pressable
            onPress={() => add(draft)}
            disabled={!editable || !draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add"
            style={({ pressed }) => [
              styles.add,
              !draft.trim() && styles.addDisabled,
              pressed && formStyles.pressed,
            ]}>
            <Plus size={20} color={Colors.onInk} strokeWidth={2.4} />
          </Pressable>
        </View>
      )}

      {!full && offered.length ? (
        <View style={styles.pills}>
          {offered.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => add(suggestion)}
              disabled={!editable}
              accessibilityRole="button"
              accessibilityLabel={`Add ${suggestion}`}
              style={({ pressed }) => [styles.suggestion, pressed && formStyles.pressed]}>
              <Plus size={12} color={Colors.textSecondary} strokeWidth={2.4} />
              <ThemedText type="caption" themeColor="textSecondary">
                {suggestion}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundSelected,
  },
  pillText: {
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
  },
  add: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.ink,
  },
  addDisabled: {
    opacity: 0.35,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
});
