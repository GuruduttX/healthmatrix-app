import { Plus, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { formStyles } from './form-styles';

/** A contact as typed: every field a string, possibly blank. */
export type ContactDraft = { name: string; relation: string; phone: string };

export const MAX_CONTACTS = 5;

type ContactsEditorProps = {
  contacts: ContactDraft[];
  onChange: (contacts: ContactDraft[]) => void;
  editable?: boolean;
};

/** The people a responder should call, each with a name, relation and mobile number. */
export function ContactsEditor({ contacts, onChange, editable = true }: ContactsEditorProps) {
  const update = (index: number, patch: Partial<ContactDraft>) =>
    onChange(contacts.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));

  return (
    <View style={styles.wrap}>
      {contacts.map((contact, index) => (
        <View key={index} style={styles.contact}>
          <View style={styles.contactHeader}>
            <ThemedText type="smallBold">Contact {index + 1}</ThemedText>
            <Pressable
              onPress={() => onChange(contacts.filter((_, i) => i !== index))}
              disabled={!editable}
              accessibilityRole="button"
              accessibilityLabel={`Remove contact ${index + 1}`}
              hitSlop={8}
              style={({ pressed }) => pressed && formStyles.pressed}>
              <Trash2 size={17} color={Colors.textSecondary} strokeWidth={2.2} />
            </Pressable>
          </View>
          <TextInput
            value={contact.name}
            onChangeText={(name) => update(index, { name })}
            placeholder="Name"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            maxLength={60}
            editable={editable}
            style={formStyles.input}
          />
          <View style={styles.row}>
            <TextInput
              value={contact.relation}
              onChangeText={(relation) => update(index, { relation })}
              placeholder="Relation, e.g. Wife"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              maxLength={30}
              editable={editable}
              style={[formStyles.input, styles.relation]}
            />
            <TextInput
              value={contact.phone}
              onChangeText={(phone) => update(index, { phone })}
              placeholder="Mobile number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={16}
              editable={editable}
              style={[formStyles.input, styles.phone]}
            />
          </View>
        </View>
      ))}

      {contacts.length < MAX_CONTACTS ? (
        <Pressable
          onPress={() => onChange([...contacts, { name: '', relation: '', phone: '' }])}
          disabled={!editable}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addContact, pressed && formStyles.pressed]}>
          <Plus size={16} color={Colors.text} strokeWidth={2.4} />
          <ThemedText type="smallBold">
            {contacts.length ? 'Add another contact' : 'Add a contact'}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two + 4,
  },
  contact: {
    gap: Spacing.two,
    padding: Spacing.two + 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  // minWidth 0 lets the two fields share the row instead of keeping their natural width.
  relation: {
    flex: 1,
    minWidth: 0,
  },
  phone: {
    flex: 1.2,
    minWidth: 0,
  },
  addContact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
});
