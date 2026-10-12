import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, Video } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { JOIN_OPENS_MS } from '@/features/consult-call/consult-call-api';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { istParts, istToday } from '@/features/doctors/time';
import { type Appointment } from '@/features/doctors/types';
import { formatDay, formatTime } from '@/features/reminders/schedule';

/** Time left as numbers and units: 2 h 10 min, 25 min, 3 days. */
function countdown(ms: number) {
  const minutes = Math.max(Math.round(ms / 60_000), 1);
  if (minutes < 60) return [{ value: minutes, unit: 'min' }];
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest
      ? [
          { value: hours, unit: 'h' },
          { value: rest, unit: 'min' },
        ]
      : [{ value: hours, unit: 'h' }];
  }
  const days = Math.round(hours / 24);
  return [{ value: days, unit: days === 1 ? 'day' : 'days' }];
}

function openConsult(appointment: Appointment) {
  router.push({ pathname: '/consult/[id]', params: { id: appointment.id } });
}

/** Lifted brand green, for the live dot on the teal card. */
const LIVE_GREEN = '#4ADE80';
/** Midway between ink and brand green. */
const TEAL = '#155A57';

/**
 * The member's next video consult on Home: the doctor, when, a countdown, and Join once the
 * waiting room opens (five minutes before) or the doctor has started.
 */
export function ConsultCard({ appointment, now }: { appointment: Appointment; now: Date }) {
  const doctor = appointment.doctor?.name ?? 'Your doctor';
  const { date, time } = istParts(appointment.scheduledAt);
  const day = formatDay(date, istToday(now));
  const untilStart = new Date(appointment.scheduledAt).getTime() - now.getTime();
  const running = appointment.status === 'in_progress';
  const canJoin = running || untilStart <= JOIN_OPENS_MS;
  const left = countdown(untilStart);
  const status = running
    ? 'The doctor is ready for you'
    : canJoin
      ? 'The waiting room is open'
      : `Starts in ${left.map((part) => `${part.value} ${part.unit}`).join(' ')}`;

  return (
    <Pressable
      onPress={() => router.navigate('/care')}
      accessibilityRole="button"
      accessibilityLabel={`Video consult with ${doctor}, ${day} at ${formatTime(time)}. ${status}.`}
      style={({ pressed }) => [styles.shadow, pressed && styles.pressed]}>
      {/* A plain View rounds and clips; the gradients are layers inside it. */}
      <View style={styles.card}>
        <LinearGradient
          colors={[Colors.ink, TEAL, Colors.success]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(221, 67, 1, 0.3)', 'rgba(221, 67, 1, 0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.45, y: 0.6 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.topRow}>
          <View style={styles.pill}>
            {canJoin ? (
              <View style={styles.liveDot} />
            ) : (
              <Video size={13} color={Colors.onInk} strokeWidth={2.4} />
            )}
            <ThemedText style={styles.pillText}>{running ? 'Live now' : 'Video consult'}</ThemedText>
          </View>
          <View style={styles.pill}>
            <ThemedText style={styles.pillText} numberOfLines={1}>
              {day} · {formatTime(time)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.doctorRow}>
          <View style={styles.avatarRing}>
            <DoctorAvatar name={doctor} photoUrl={appointment.doctor?.photoUrl} size={50} />
            <View style={styles.camBadge}>
              <Video size={10} color={Colors.onInk} strokeWidth={2.8} />
            </View>
          </View>
          <View style={styles.flex}>
            <ThemedText style={styles.doctorName} numberOfLines={1}>
              {doctor}
            </ThemedText>
            <ThemedText type="caption" style={styles.muted} numberOfLines={1}>
              {specialtyLabel(appointment.specialty)} · {appointment.durationMinutes} min
            </ThemedText>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.flex}>
            <ThemedText type="caption" style={styles.muted}>
              {running ? 'In progress' : canJoin ? 'Waiting room' : 'Starts in'}
            </ThemedText>
            {running || canJoin ? (
              <ThemedText style={styles.bigText} numberOfLines={1}>
                {running ? 'Doctor is ready' : 'Open now'}
              </ThemedText>
            ) : (
              <ThemedText style={styles.bigText} numberOfLines={1}>
                {left.map((part, i) => (
                  <ThemedText key={part.unit} style={styles.bigText}>
                    {i > 0 ? ' ' : ''}
                    {part.value}
                    <ThemedText style={styles.unit}> {part.unit}</ThemedText>
                  </ThemedText>
                ))}
              </ThemedText>
            )}
          </View>

          {canJoin ? (
            <Pressable
              onPress={() => openConsult(appointment)}
              accessibilityRole="button"
              accessibilityLabel={`Join video consult with ${doctor}`}
              hitSlop={6}
              style={({ pressed }) => [styles.join, pressed && styles.pressed]}>
              <Video size={16} color={Colors.onInk} strokeWidth={2.4} />
              <ThemedText type="smallBold" themeColor="onInk">
                {running ? 'Join now' : 'Join call'}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.details}>
              <ThemedText type="smallBold" themeColor="onInk">
                Details
              </ThemedText>
              <ChevronRight size={16} color={Colors.onInk} strokeWidth={2.4} />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The shadow sits outside the gradient, which clips its corners.
  shadow: {
    borderRadius: Radius.xl,
    boxShadow: '0 14px 30px rgba(16, 128, 109, 0.28)',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  card: {
    gap: Spacing.three - 2,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.ink,
  },
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  pillText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onInk,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: LIVE_GREEN,
    boxShadow: '0 0 0 3px rgba(74, 222, 128, 0.25)',
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  camBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: TEAL,
    backgroundColor: Colors.primary,
  },
  doctorName: {
    fontFamily: Fonts.display,
    fontSize: 19,
    lineHeight: 24,
    color: Colors.onInk,
  },
  muted: {
    color: Colors.onInkMuted,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bigText: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onInk,
  },
  unit: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: Colors.onInkMuted,
  },
  join: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    boxShadow: '0 8px 20px rgba(221, 67, 1, 0.45)',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 9,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
});
