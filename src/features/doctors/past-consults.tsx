import { router } from 'expo-router';
import { CalendarCheck, FileText, RotateCcw, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { DoctorAvatar } from './doctor-avatar';
import { specialtyLabel } from './specialties';
import { formatSlot } from './time';
import { type PastConsult } from './types';

/** How long the call ran, from the doctor starting it to ending it: "18 min". */
function duration({ startedAt, endedAt }: PastConsult) {
  if (!startedAt || !endedAt) return null;
  const minutes = Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

function Action({
  icon: Icon,
  label,
  onPress,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Icon size={13} color={Colors.primary} strokeWidth={2.4} />
      <ThemedText type="caption" themeColor="primary" style={styles.actionText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * The Past tab of "Your consults" on the Care tab: every completed consult, newest first, with
 * the prescription signed in it and a quick way to book the same doctor again.
 */
export function PastConsultsList({ consults }: { consults: PastConsult[] }) {
  return (
    <Surface style={styles.card}>
      {consults.map((consult, index) => {
        const doctorName = consult.doctor?.name ?? 'Doctor';
        const ran = duration(consult);
        return (
          <View key={consult.id} style={[styles.row, index > 0 && styles.divider]}>
            <DoctorAvatar name={doctorName} photoUrl={consult.doctor?.photoUrl} size={44} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {doctorName}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {specialtyLabel(consult.specialty)} · Video consult
              </ThemedText>
              <View style={styles.when}>
                <CalendarCheck size={13} color={Colors.success} strokeWidth={2.4} />
                <ThemedText type="caption" themeColor="success" style={styles.whenText}>
                  {formatSlot(consult.scheduledAt)}
                  {ran ? ` · ${ran}` : ''}
                </ThemedText>
              </View>
              {consult.reason ? (
                <ThemedText type="caption" themeColor="textMuted" numberOfLines={2}>
                  {consult.reason}
                </ThemedText>
              ) : null}
              <View style={styles.actions}>
                {consult.prescriptionId ? (
                  <Action
                    icon={FileText}
                    label="Prescription"
                    accessibilityLabel={`Open the prescription from ${doctorName}`}
                    onPress={() =>
                      router.push({
                        pathname: '/records/[id]',
                        params: { id: consult.prescriptionId! },
                      })
                    }
                  />
                ) : null}
                {consult.doctor ? (
                  <Action
                    icon={RotateCcw}
                    label="Book again"
                    accessibilityLabel={`Book again with ${doctorName}`}
                    onPress={() =>
                      router.push({
                        pathname: '/care/book/[doctorId]',
                        params: { doctorId: consult.doctor!.id, specialty: consult.specialty },
                      })
                    }
                  />
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.one,
  },
  flex: {
    flex: 1,
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 4,
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  whenText: {
    fontFamily: Fonts.semibold,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    backgroundColor: Colors.primarySoft,
  },
  actionText: {
    fontFamily: Fonts.bold,
  },
  pressed: {
    opacity: 0.7,
  },
});
