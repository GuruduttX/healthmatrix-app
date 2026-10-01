import { FlaskConical, Syringe, Video, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Surface } from '@/components/ui/surface';
import { Colors, Spacing } from '@/constants/theme';

import { type Reminder, type ReminderKind } from './sample-data';

const KINDS: Record<ReminderKind, { icon: LucideIcon; tone: Tone }> = {
  test: { icon: FlaskConical, tone: 'primary' },
  vaccine: { icon: Syringe, tone: 'success' },
  consult: { icon: Video, tone: 'neutral' },
};

export function ReminderList({ reminders }: { reminders: Reminder[] }) {
  return (
    <Surface style={styles.card}>
      {reminders.map((reminder, index) => (
        <View key={reminder.id} style={[styles.row, index > 0 && styles.divider]}>
          <IconTile {...KINDS[reminder.kind]} size={36} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{reminder.title}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {reminder.who}
            </ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {reminder.due}
          </ThemedText>
        </View>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: 10,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
