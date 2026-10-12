import { router } from 'expo-router';
import { CalendarSearch, Clock, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

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
 * Custom-time requests at the top of the Upcoming tab: waiting for the doctor (with Withdraw),
 * or declined or unanswered (with a way to book an open slot instead).
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
    <Surface style={styles.card}>
      {requests.map((request, index) => {
        const doctor = request.doctor?.name ?? 'Doctor';
        const pending = request.status === 'pending';
        return (
          <View key={request.id} style={[styles.row, index > 0 && styles.divider]}>
            <DoctorAvatar name={doctor} photoUrl={request.doctor?.photoUrl} size={44} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {doctor}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {specialtyLabel(request.specialty)} · Custom time
              </ThemedText>
              <View style={styles.when}>
                <Clock
                  size={13}
                  color={pending ? Colors.warning : Colors.textMuted}
                  strokeWidth={2.4}
                />
                <ThemedText
                  type="caption"
                  themeColor={pending ? 'warning' : 'textMuted'}
                  style={[styles.whenText, !pending && styles.struck]}>
                  {formatSlot(request.requestedAt)}
                </ThemedText>
              </View>
              <View style={styles.status}>
                {pending ? (
                  <Tag label="Waiting for the doctor" tone="warning" icon={Clock} />
                ) : request.status === 'declined' ? (
                  <Tag label="Doctor not available" tone="danger" icon={XCircle} />
                ) : (
                  <Tag label="No reply in time" tone="neutral" />
                )}
              </View>
              {request.status === 'declined' ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {request.declineReason ??
                    `${doctor} can’t do this time. Pick one of their open slots instead.`}
                </ThemedText>
              ) : request.status === 'expired' ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {doctor} didn’t answer before this time. Pick one of their open slots.
                </ThemedText>
              ) : null}
            </View>
            {pending ? (
              <Pressable
                onPress={() => withdrawOne(request)}
                disabled={busyId === request.id}
                accessibilityRole="button"
                accessibilityLabel={`Withdraw request to ${doctor}`}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.action,
                  styles.withdraw,
                  pressed && styles.pressed,
                ]}>
                {busyId === request.id ? (
                  <ActivityIndicator size="small" color={Colors.danger} />
                ) : (
                  <ThemedText type="caption" themeColor="danger" style={styles.bold}>
                    Withdraw
                  </ThemedText>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => bookAnother(request)}
                accessibilityRole="button"
                accessibilityLabel={`Book another time with ${doctor}`}
                hitSlop={8}
                style={({ pressed }) => [styles.action, styles.another, pressed && styles.pressed]}>
                <CalendarSearch size={13} color={Colors.onInk} strokeWidth={2.4} />
                <ThemedText type="caption" style={[styles.bold, styles.onInk]}>
                  Book a slot
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
  struck: {
    textDecorationLine: 'line-through',
  },
  status: {
    marginTop: 6,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 76,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
  },
  withdraw: {
    borderWidth: 1,
    borderColor: Colors.dangerSoft,
  },
  another: {
    backgroundColor: Colors.primary,
  },
  onInk: {
    color: Colors.onInk,
  },
  bold: {
    fontFamily: Fonts.bold,
  },
  pressed: {
    opacity: 0.7,
  },
});
