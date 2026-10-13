import { Plus, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { formStyles } from './form-styles';

/** A contact as typed: every field a string, possibly blank. */
export type ContactDraft = { name: string; relation: string; phone: string };

export const MAX_CONTACTS = 5;

type ContactsEditorProps = {
  contacts: ContactDraft[];
  onChange: (contacts: ContactDraft[]) => void;
  editable?: boolean;
};

/**
 * The people a responder should call, each with a name, relation and mobile number: one after
 * another with a hairline between, and a way to add one more.
 */
export function ContactsEditor({ contacts, onChange, editable = true }: ContactsEditorProps) {
  const update = (index: number, patch: Partial<ContactDraft>) =>
    onChange(contacts.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));

  return (
    <View>
      {contacts.map((contact, index) => {
        const who = `Contact ${index + 1}`;
        return (
          <View key={index} style={[styles.contact, index > 0 && styles.divided]}>
            <View style={styles.contactHeader}>
              <ThemedText style={styles.contactTitle} accessibilityRole="header">
                {who}
              </ThemedText>
              <Pressable
                onPress={() => onChange(contacts.filter((_, i) => i !== index))}
                disabled={!editable}
                accessibilityRole="button"
                accessibilityLabel={`Remove contact ${index + 1}`}
                hitSlop={8}
                style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}>
                <Trash2 size={16} color={Colors.textSoft} strokeWidth={2.2} />
              </Pressable>
            </View>
            <TextField
              value={contact.name}
              onChangeText={(name) => update(index, { name })}
              placeholder="Name"
              accessibilityLabel={`${who} name`}
              autoCapitalize="words"
              maxLength={60}
              editable={editable}
            />
            <View style={styles.row}>
              {/* minWidth 0 lets the two fields share the row instead of keeping their natural width. */}
              <View style={styles.relation}>
                <TextField
                  value={contact.relation}
                  onChangeText={(relation) => update(index, { relation })}
                  placeholder="Relation, e.g. Wife"
                  accessibilityLabel={`${who} relation`}
                  autoCapitalize="words"
                  maxLength={30}
                  editable={editable}
                />
              </View>
              <View style={styles.phone}>
                <TextField
                  value={contact.phone}
                  onChangeText={(phone) => update(index, { phone })}
                  placeholder="Mobile number"
                  accessibilityLabel={`${who} mobile number`}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  maxLength={16}
                  editable={editable}
                />
              </View>
            </View>
          </View>
        );
      })}

      {contacts.length < MAX_CONTACTS ? (
        <Pressable
          onPress={() => onChange([...contacts, { name: '', relation: '', phone: '' }])}
          disabled={!editable}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.add,
            contacts.length > 0 && styles.divided,
            pressed && formStyles.pressed,
          ]}>
          <View style={formStyles.roundButton}>
            <Plus size={18} color={Colors.primaryDeep} strokeWidth={2.4} />
          </View>
          <ThemedText style={styles.addText}>
            {contacts.length ? 'Add another contact' : 'Add a contact'}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contact: {
    gap: Spacing.two,
    paddingBottom: Spacing.three - 2,
  },
  // A hairline between contacts, and above the add row.
  divided: {
    paddingTop: Spacing.three - 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.text,
  },
  remove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
  },
  removePressed: {
    backgroundColor: Colors.highSoft,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  relation: {
    flex: 1,
    minWidth: 0,
  },
  phone: {
    flex: 1.2,
    minWidth: 0,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    minHeight: 44,
  },
  addText: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.primaryDeep,
  },
});
