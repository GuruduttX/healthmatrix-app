import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export type LabSex = 'male' | 'female';

type LabDetailsProps = {
  /** Ask for the date of birth: the member has none on file. */
  askDateOfBirth: boolean;
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
 * of birth (saved to the profile) and the sex the lab should read results against. Mobilab's
 * reference ranges are set for male or female, so a member whose gender is "other" picks one here
 * for the lab only; their profile keeps what they chose.
 */
export function LabDetails({
  askDateOfBirth,
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
      caption="Results are read against ranges for age and sex"
      index={3}>
      <View style={styles.body}>
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
            <ThemedText style={styles.label}>Sex for lab ranges</ThemedText>
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
  error: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
});
