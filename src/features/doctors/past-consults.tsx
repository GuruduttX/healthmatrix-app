import { router } from 'expo-router';
import { FileText, RotateCcw, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Colors, Fonts, Spacing } from '@/constants/theme';

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

/** A quiet link under the row's words: an icon and a word in deep orange, no fill. */
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
      hitSlop={8}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Icon size={14} color={Colors.primaryDeep} strokeWidth={2.4} />
      <ThemedText style={styles.actionText}>{label}</ThemedText>
    </Pressable>
  );
}

/**
 * The Past tab of "Your consults" on the Care tab: every completed consult, newest first, with
 * the prescription signed in it and a quick way to book the same doctor again.
 */
export function PastConsultsList({ consults }: { consults: PastConsult[] }) {
  return (
    <ListCard>
      {consults.map((consult) => {
        const doctorName = consult.doctor?.name ?? 'Doctor';
        const ran = duration(consult);
        return (
          <ListRow
            key={consult.id}
            leading={
              <DoctorAvatar
                name={doctorName}
                photoUrl={consult.doctor?.photoUrl}
                size={LIST_LEAD}
              />
            }
            title={doctorName}
            subtitle={
              <>
                <ThemedText style={listText.subtitle} numberOfLines={1}>
                  {specialtyLabel(consult.specialty)} · Video consult
                </ThemedText>
                <ThemedText style={styles.when} numberOfLines={1}>
                  {formatSlot(consult.scheduledAt)}
                  {ran ? ` · ${ran}` : ''}
                </ThemedText>
                {consult.reason ? (
                  <ThemedText style={styles.reason} numberOfLines={2}>
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
              </>
            }
            style={styles.row}
          />
        );
      })}
    </ListCard>
  );
}

const styles = StyleSheet.create({
  // The words run four lines, so the photo sits by the name rather than in the middle.
  row: {
    alignItems: 'flex-start',
  },
  when: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  reason: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three + 2,
    marginTop: Spacing.two - 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 28,
  },
  actionText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  pressed: {
    opacity: 0.6,
  },
});
