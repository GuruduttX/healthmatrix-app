import { router } from 'expo-router';
import { CalendarClock, CalendarX, Video } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionHeader } from '@/components/ui/section-header';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useNow } from '@/features/reminders/use-now';

import { DoctorAvatar } from './doctor-avatar';
import { specialtyLabel } from './specialties';
import { formatSlot } from './time';
import { type Appointment } from './types';
import { useAppointments } from './use-appointments';

/** Within this long before the start, a consult shows as starting soon. */
const SOON_MS = 15 * 60 * 1000;

function confirmCancel(appointment: Appointment) {
  const who = appointment.doctor?.name ?? 'the doctor';
  const message = `Your consult with ${who} on ${formatSlot(appointment.scheduledAt)} will be cancelled and the slot freed.`;
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`Cancel this appointment?\n\n${message}`) ?? false);
  }
  return new Promise<boolean>((resolve) =>
    Alert.alert('Cancel this appointment?', message, [
      { text: 'Keep it', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Cancel appointment', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** Rebooking after the doctor cancelled: the same doctor, for the same specialty. */
function bookAgain(appointment: Appointment) {
  if (!appointment.doctor) return router.push('/care');
  router.push({
    pathname: '/care/book/[doctorId]',
    params: { doctorId: appointment.doctor.id, specialty: appointment.specialty },
  });
}

/**
 * "Upcoming appointments" on the Care tab, heading included. Hidden when there are none.
 * Consults the doctor cancelled in the console stay for a while, with their reason.
 */
export function UpcomingAppointments() {
  const { appointments, cancel } = useAppointments();
  const now = useNow();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!appointments?.length) return null;

  const cancelOne = async (appointment: Appointment) => {
    if (!(await confirmCancel(appointment))) return;
    setBusyId(appointment.id);
    setError(null);
    try {
      await cancel(appointment.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Upcoming appointments" />
      <Surface style={styles.card}>
        {appointments.map((appointment, index) => {
          const startsIn = new Date(appointment.scheduledAt).getTime() - now.getTime();
          const running = appointment.status === 'in_progress';
          const cancelledByDoctor = appointment.status === 'cancelled';
          const soon = running || startsIn <= SOON_MS;
          return (
            <View key={appointment.id} style={[styles.row, index > 0 && styles.divider]}>
              <DoctorAvatar
                name={appointment.doctor?.name ?? 'Doctor'}
                photoUrl={appointment.doctor?.photoUrl}
                size={44}
              />
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {appointment.doctor?.name ?? 'Doctor'}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {specialtyLabel(appointment.specialty)} · Video consult
                </ThemedText>
                <View style={styles.when}>
                  {cancelledByDoctor ? (
                    <CalendarX size={13} color={Colors.danger} strokeWidth={2.4} />
                  ) : (
                    <CalendarClock size={13} color={Colors.primary} strokeWidth={2.4} />
                  )}
                  <ThemedText
                    type="caption"
                    themeColor={cancelledByDoctor ? 'danger' : 'primary'}
                    style={[styles.whenText, cancelledByDoctor && styles.struck]}>
                    {formatSlot(appointment.scheduledAt)}
                  </ThemedText>
                </View>
                {cancelledByDoctor ? (
                  <ThemedText type="caption" themeColor="textSecondary">
                    Cancelled by doctor.{' '}
                    {appointment.cancelReason ?? 'Please book another slot.'}
                  </ThemedText>
                ) : null}
              </View>
              {cancelledByDoctor ? (
                <Pressable
                  onPress={() => bookAgain(appointment)}
                  accessibilityRole="button"
                  accessibilityLabel={`Book again with ${appointment.doctor?.name ?? 'a doctor'}`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.rebook, pressed && styles.pressed]}>
                  <ThemedText type="caption" themeColor="primary" style={styles.cancelText}>
                    Book again
                  </ThemedText>
                </Pressable>
              ) : running ? (
                <Tag label="Doctor is ready" tone="success" icon={Video} />
              ) : soon ? (
                <Tag label="Starting soon" tone="success" icon={Video} />
              ) : (
                <Pressable
                  onPress={() => cancelOne(appointment)}
                  disabled={busyId === appointment.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel appointment with ${appointment.doctor?.name ?? 'the doctor'}`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
                  <ThemedText type="caption" themeColor="danger" style={styles.cancelText}>
                    {busyId === appointment.id ? 'Cancelling…' : 'Cancel'}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          );
        })}
        {error ? (
          <ThemedText type="caption" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two + 2,
  },
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
  cancel: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dangerSoft,
  },
  cancelText: {
    fontFamily: Fonts.bold,
  },
  rebook: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  pressed: {
    opacity: 0.7,
  },
});
