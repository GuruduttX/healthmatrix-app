import { router } from 'expo-router';
import { AlertCircle, CalendarSearch, Clock, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Divided, LIST_LEAD, ListRow, listText } from '@/components/ui/list';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { PillButton, TextButton } from './consult-actions';
import { DoctorAvatar } from './doctor-avatar';
import { specialtyLabel } from './specialties';
import { formatSlot } from './time';
import { type ConsultRequest } from './types';
import { useConsultRequests } from './use-consult-requests';

function confirmWithdraw(request: ConsultRequest) {
  const who = request.doctor?.name ?? 'the doctor';
  const message = `Your request to ${who} for ${formatSlot(request.requestedAt)} will be withdrawn.`;
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`Withdraw this request?\n\n${message}`) ?? false);
  }
  return new Promise<boolean>((resolve) =>
    Alert.alert('Withdraw this request?', message, [
      { text: 'Keep it', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Withdraw', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** Pick one of the same doctor's open slots instead. */
function bookAnother(request: ConsultRequest) {
  if (!request.doctor) return router.push('/care');
  router.push({
    pathname: '/care/book/[doctorId]',
    params: { doctorId: request.doctor.id, specialty: request.specialty },
  });
}

/**
 * Custom-time requests at the top of the Upcoming tab, as rows for a `ListCard`: waiting for the
 * doctor (with Withdraw), or declined or unanswered (with a way to book an open slot instead).
 */
export function ConsultRequestsList({ requests }: { requests: ConsultRequest[] }) {
  const { withdraw } = useConsultRequests();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const withdrawOne = async (request: ConsultRequest) => {
    if (!(await confirmWithdraw(request))) return;
    setBusyId(request.id);
    setError(null);
    try {
      await withdraw(request.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not withdraw. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Divided>
        {requests.map((request) => {
          const doctor = request.doctor?.name ?? 'Doctor';
          const pending = request.status === 'pending';
          const note =
            request.status === 'declined'
              ? (request.declineReason ??
                `${doctor} can’t do this time. Pick one of their open slots instead.`)
              : request.status === 'expired'
                ? `${doctor} didn’t answer before this time. Pick one of their open slots.`
                : null;

          return (
            <ListRow
              key={request.id}
              leading={
                <DoctorAvatar name={doctor} photoUrl={request.doctor?.photoUrl} size={LIST_LEAD} />
              }
              title={doctor}
              subtitle={
                <>
                  <ThemedText style={listText.subtitle} numberOfLines={1}>
                    {specialtyLabel(request.specialty)} · Custom time
                  </ThemedText>
                  <ThemedText style={[styles.when, !pending && styles.struck]} numberOfLines={1}>
                    {formatSlot(request.requestedAt)}
                  </ThemedText>
                  <View style={styles.status}>
                    {pending ? (
                      <Tag label="Waiting for the doctor" tone="warning" icon={Clock} />
                    ) : request.status === 'declined' ? (
                      <Tag label="Doctor not available" tone="danger" icon={XCircle} />
                    ) : (
                      <Tag label="No reply in time" tone="neutral" icon={Clock} />
                    )}
                  </View>
                  {note ? <ThemedText style={styles.note}>{note}</ThemedText> : null}
                </>
              }
              trailing={
                pending ? (
                  <TextButton
                    label="Withdraw"
                    tone="danger"
                    busy={busyId === request.id}
                    onPress={() => withdrawOne(request)}
                    accessibilityLabel={`Withdraw request to ${doctor}`}
                  />
                ) : (
                  <PillButton
                    label="Book a slot"
                    icon={CalendarSearch}
                    onPress={() => bookAnother(request)}
                    accessibilityLabel={`Book another time with ${doctor}`}
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
  // The time asked for: a step stronger than the line above it, struck once it no longer stands.
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
  status: {
    flexDirection: 'row',
    marginTop: 5,
  },
  note: {
    marginTop: 4,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
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
