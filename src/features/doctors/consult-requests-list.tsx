import { router } from 'expo-router';
import { AlertCircle, CalendarSearch, Clock, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Divided, LIST_LEAD, ListRow, listText } from '@/components/ui/list';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { LinkButton, LinkRow } from './consult-actions';
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

type ConsultRequestRowProps = {
  request: ConsultRequest;
  /** Waiting requests can be withdrawn; leave out where they can't be (the Past tab). */
  onWithdraw?: () => void;
  withdrawing?: boolean;
};

/**
 * One custom-time request, as a row for a `ListCard`: the doctor, the time asked for (struck once
 * it no longer stands), where it stands, and one quiet link under the words: Withdraw while it
 * waits, Book a slot once the doctor said no or didn't answer. The doctor's own reason for saying
 * no shows when they gave one; the flag says the rest.
 */
export function ConsultRequestRow({ request, onWithdraw, withdrawing }: ConsultRequestRowProps) {
  const doctor = request.doctor?.name ?? 'Doctor';
  const pending = request.status === 'pending';

  return (
    <ListRow
      leading={<DoctorAvatar name={doctor} photoUrl={request.doctor?.photoUrl} size={LIST_LEAD} />}
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
          {request.status === 'declined' && request.declineReason ? (
            <ThemedText style={styles.reason} numberOfLines={3}>
              “{request.declineReason}”
            </ThemedText>
          ) : null}
          <LinkRow>
            {pending && onWithdraw ? (
              <LinkButton
                label="Withdraw"
                tone="danger"
                busy={withdrawing}
                onPress={onWithdraw}
                accessibilityLabel={`Withdraw request to ${doctor}`}
              />
            ) : !pending && request.doctor ? (
              <LinkButton
                label="Book a slot"
                icon={CalendarSearch}
                onPress={() => bookAnother(request)}
                accessibilityLabel={`Book one of ${doctor}’s open slots`}
              />
            ) : null}
          </LinkRow>
        </>
      }
      // Several lines of words, so the photo sits by the name rather than in the middle.
      style={styles.row}
    />
  );
}

/**
 * Custom-time requests still ahead, at the top of the Upcoming tab, as rows for a `ListCard`:
 * waiting for the doctor (with Withdraw), or declined for a time still to come (with a way to
 * book an open slot instead). Ones whose time has passed are on the Past tab.
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
        {requests.map((request) => (
          <ConsultRequestRow
            key={request.id}
            request={request}
            onWithdraw={() => void withdrawOne(request)}
            withdrawing={busyId === request.id}
          />
        ))}
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
  row: {
    alignItems: 'flex-start',
  },
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
  // The doctor's own words, quoted.
  reason: {
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
