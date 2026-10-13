import { Plus, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { formStyles } from './form-styles';

type ListEditorProps = {
  items: string[];
  onChange: (items: string[]) => void;
  /** What is typed but not yet added. Kept by the screen so Save can include it. */
  draft: string;
  onDraftChange: (draft: string) => void;
  placeholder: string;
  /** What the list is, for screen readers: "Allergies". */
  label?: string;
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
  label,
  suggestions = [],
  max = 20,
  editable = true,
}: ListEditorProps) {
  const full = items.length >= max;
  const offered = suggestions.filter((suggestion) => !has(items, suggestion));
  const canAdd = editable && !!draft.trim();

  const add = (value: string) => {
    onChange(addItem(items, value));
    onDraftChange('');
  };

  return (
    <View style={styles.wrap}>
      {items.length ? (
        <View style={styles.pills}>
          {items.map((item) => (
            <View key={item} style={formStyles.pill}>
              <ThemedText style={formStyles.pillText}>{item}</ThemedText>
              <Pressable
                onPress={() => onChange(items.filter((other) => other !== item))}
                disabled={!editable}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item}`}
                hitSlop={10}
                style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}>
                <X size={13} color={Colors.textSoft} strokeWidth={2.6} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {full ? null : (
        <TextField
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={() => add(draft)}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder={placeholder}
          accessibilityLabel={label ? `Add to ${label.toLowerCase()}` : undefined}
          maxLength={80}
          editable={editable}
          trailing={
            <Pressable
              onPress={() => add(draft)}
              disabled={!canAdd}
              accessibilityRole="button"
              accessibilityLabel="Add"
              accessibilityState={{ disabled: !canAdd }}
              hitSlop={6}
              style={({ pressed }) => [
                formStyles.roundButton,
                styles.add,
                !canAdd && formStyles.roundButtonDisabled,
                pressed && formStyles.roundButtonPressed,
              ]}>
              <Plus size={18} color={Colors.primaryDeep} strokeWidth={2.4} />
            </Pressable>
          }
        />
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
              hitSlop={4}
              style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}>
              <Plus size={12} color={Colors.textSoft} strokeWidth={2.6} />
              <ThemedText style={styles.suggestionText}>{suggestion}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three - 4,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  remove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.well,
  },
  removePressed: {
    backgroundColor: Colors.backgroundSelected,
  },
  // Sits at the field's right edge, inside its outline.
  add: {
    marginRight: -6,
  },
  // Offered, not yet added: a dashed outline and a plus.
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingLeft: 9,
    paddingRight: 11,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  suggestionPressed: {
    backgroundColor: Colors.well,
    transform: [{ scale: 0.97 }],
  },
  suggestionText: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textSoft,
  },
});
