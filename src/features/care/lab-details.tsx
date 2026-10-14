import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export type LabSex = 'male' | 'female';

type LabDetailsProps = {
  /** Ask for the date of birth: the member has none on file, or chose to change it. */
  askDateOfBirth: boolean;
  /** The date of birth on file, "1990-06-15", shown with the age while it isn't being asked. */
  savedDateOfBirth?: string;
  /** Turns the saved date of birth back into a field, to correct it. */
  onChangeSavedDateOfBirth?: () => void;
  /** Ask for the sex: the member's gender isn't male or female, or isn't set. */
  askSex: boolean;
  dateOfBirth: string;
  sex?: LabSex;
  onChangeDateOfBirth: (text: string) => void;
  onChangeSex: (sex: LabSex) => void;
  error?: string | null;
};

/** "15061990" or "15/06/1990" as typed -> "15/06/1990", slashes added as the digits come. */
export function formatDateInput(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1990-06-15" -> "15/06/1990", for the field when changing a saved date. */
export function toDateInput(iso: string) {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** "1990-06-15" -> "15 Jun 1990 · 36 years" */
function describeBirth(iso: string, today = new Date()) {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  const birthdayPassed =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  const age = today.getFullYear() - year - (birthdayPassed ? 0 : 1);
  return `${day} ${MONTHS[month - 1]} ${year} · ${age} ${age === 1 ? 'year' : 'years'}`;
}

/** "15/06/1990" -> "1990-06-15", or null when it isn't a real past date. */
export function parseDateInput(text: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  const valid =
    date.getUTCDate() === Number(day) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date < new Date() &&
    Number(year) > 1900;
  return valid ? iso : null;
}

/**
 * What the lab needs that the member's profile doesn't have yet, asked once at booking: the date
 * of birth and the gender the lab reads results against, both saved to the profile. Mobilab's
 * reference ranges are set for male or female, so a member whose gender is "other" picks one here
 * for the lab only; their profile keeps what they chose. Shown at all only when something is
 * missing; then a date of birth already on file shows with the age, to check or change.
 */
export function LabDetails({
  askDateOfBirth,
  savedDateOfBirth,
  onChangeSavedDateOfBirth,
  askSex,
  dateOfBirth,
  sex,
  onChangeDateOfBirth,
  onChangeSex,
  error,
}: LabDetailsProps) {
  if (!askDateOfBirth && !askSex) return null;

  return (
    <Section
      title="Your details for the lab"
      caption="Results are read against ranges for age and gender"
      index={3}>
      <View style={styles.body}>
        {!askDateOfBirth && savedDateOfBirth ? (
          <View style={styles.sex}>
            <ThemedText style={styles.label}>Date of birth</ThemedText>
            <View style={styles.saved}>
              <ThemedText style={[styles.savedValue, styles.flex]}>
                {describeBirth(savedDateOfBirth)}
              </ThemedText>
              {onChangeSavedDateOfBirth ? (
                <Pressable
                  onPress={onChangeSavedDateOfBirth}
                  accessibilityRole="button"
                  accessibilityLabel="Change date of birth"
                  hitSlop={10}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText style={styles.change}>Change</ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
        {askDateOfBirth ? (
          <TextField
            label="Date of birth"
            placeholder="DD/MM/YYYY"
            value={dateOfBirth}
            onChangeText={(text) => onChangeDateOfBirth(formatDateInput(text))}
            keyboardType="number-pad"
            maxLength={10}
            autoComplete="birthdate-full"
            textContentType="birthdate"
            hint="Saved to your profile"
          />
        ) : null}
        {askSex ? (
          <View style={styles.sex}>
            <ThemedText style={styles.label}>Gender</ThemedText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              <Chip label="Female" selected={sex === 'female'} onPress={() => onChangeSex('female')} />
              <Chip label="Male" selected={sex === 'male'} onPress={() => onChangeSex('male')} />
            </View>
          </View>
        ) : null}
        {error ? (
          <ThemedText style={styles.error} accessibilityRole="alert">
            {error}
          </ThemedText>
        ) : null}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  sex: {
    gap: Spacing.two,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  savedValue: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text,
  },
  change: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  pressed: {
    opacity: 0.6,
  },
  error: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
});
