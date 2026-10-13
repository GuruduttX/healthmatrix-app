import { router } from 'expo-router';
import { AlertCircle, CalendarPlus, CalendarX, Video } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Divided, ListRow, listText } from '@/components/ui/list';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { JOIN_OPENS_MS } from '@/features/consult-call/consult-call-api';
import { useNow } from '@/features/reminders/use-now';

import { ConsultAvatar, PillButton, TextButton } from './consult-actions';
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

function join(appointment: Appointment) {
  router.push({ pathname: '/consult/[id]', params: { id: appointment.id } });
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
 * The Upcoming tab of "Your consults" on the Care tab (`ConsultsSection`): one row per consult,
 * for a `ListCard`. Consults the doctor cancelled in the console stay for a while, with their
 * reason.
 */
export function UpcomingList({ appointments }: { appointments: Appointment[] }) {
  const { cancel } = useAppointments();
  const now = useNow();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <>
      <Divided>
        {appointments.map((appointment) => {
          const doctor = appointment.doctor?.name ?? 'Doctor';
          const who = appointment.doctor?.name ?? 'the doctor';
          const startsIn = new Date(appointment.scheduledAt).getTime() - now.getTime();
          const running = appointment.status === 'in_progress';
          const cancelledByDoctor = appointment.status === 'cancelled';
          const soon = running || startsIn <= SOON_MS;
          // The waiting room opens five minutes before the slot.
          const canJoin = !cancelledByDoctor && (running || startsIn <= JOIN_OPENS_MS);

          return (
            <ListRow
              key={appointment.id}
              leading={
                <ConsultAvatar
                  name={doctor}
                  photoUrl={appointment.doctor?.photoUrl}
                  live={canJoin}
                />
              }
              title={doctor}
              subtitle={
                <>
                  <ThemedText style={listText.subtitle} numberOfLines={1}>
                    {specialtyLabel(appointment.specialty)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.when, cancelledByDoctor && styles.struck]}
                    numberOfLines={1}>
                    {formatSlot(appointment.scheduledAt)} · Video
                  </ThemedText>
                  {cancelledByDoctor ? (
                    <View style={styles.note}>
                      <CalendarX
                        size={13}
                        color={Colors.high}
                        strokeWidth={2.4}
                        style={styles.noteIcon}
                      />
                      <ThemedText style={styles.noteText}>
                        <ThemedText style={styles.noteFlag}>Cancelled by doctor. </ThemedText>
                        {appointment.cancelReason ?? 'Please book another slot.'}
                      </ThemedText>
                    </View>
                  ) : running ? (
                    // The photo's camera badge turns teal-blue with it, as on Home.
                    <ThemedText style={styles.live}>The doctor is ready for you</ThemedText>
                  ) : null}
                </>
              }
              trailing={
                cancelledByDoctor ? (
                  <PillButton
                    label="Book again"
                    icon={CalendarPlus}
                    onPress={() => bookAgain(appointment)}
                    accessibilityLabel={`Book again with ${appointment.doctor?.name ?? 'a doctor'}`}
                  />
                ) : canJoin ? (
                  <PillButton
                    label="Join"
                    icon={Video}
                    solid
                    onPress={() => join(appointment)}
                    accessibilityLabel={`Join video consult with ${who}`}
                  />
                ) : soon ? (
                  <Tag label="Starting soon" tone="success" icon={Video} />
                ) : (
                  <TextButton
                    label={busyId === appointment.id ? 'Cancelling…' : 'Cancel'}
                    tone="danger"
                    busy={busyId === appointment.id}
                    onPress={() => cancelOne(appointment)}
                    accessibilityLabel={`Cancel appointment with ${who}`}
                  />
                )
              }
            />
          );
        })}
      </Divided>
      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // The time is what the row is for: a step stronger than the specialty above it.
  when: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  struck: {
    color: Colors.textFaint,
    textDecorationLine: 'line-through',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 3,
  },
  noteIcon: {
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  // Nested in the note, so it sets its own line height.
  noteFlag: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.high,
  },
  live: {
    marginTop: 1,
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.good,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: Spacing.three - 4,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
});
