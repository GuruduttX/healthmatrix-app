import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CalendarClock, CalendarPlus, Stethoscope } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot, istParts, istToday } from '@/features/doctors/time';
import { type FeaturedDoctor } from '@/features/doctors/types';
import { formatDay } from '@/features/reminders/schedule';

type DoctorHeroProps = {
  /** `undefined` while loading, `null` when none of the member's past doctors is online. */
  featured: FeaturedDoctor | null | undefined;
};

/** "Last consult yesterday · 3 consults" */
function history({ lastConsultAt, consultCount }: FeaturedDoctor) {
  const day = formatDay(istParts(lastConsultAt).date, istToday());
  const when = /^(Today|Yesterday)$/.test(day) ? day.toLowerCase() : `on ${day}`;
  return `Last consult ${when}${consultCount > 1 ? ` · ${consultCount} consults` : ''}`;
}

function bookWith({ doctor, specialty }: FeaturedDoctor) {
  router.push({
    pathname: '/care/book/[doctorId]',
    params: { doctorId: doctor.id, ...(specialty && { specialty }) },
  });
}

/**
 * The top of the Care tab. While a doctor who has seen the member before is online (in a consult
 * with anyone), it offers a follow-up with them. Otherwise it points to the general physicians.
 */
export function DoctorHero({ featured }: DoctorHeroProps) {
  return (
    <LinearGradient
      colors={[Colors.ink, Colors.inkMid]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      {featured === undefined ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.onInk} />
        </View>
      ) : featured ? (
        <DoctorOnline featured={featured} />
      ) : (
        <FindADoctor />
      )}
    </LinearGradient>
  );
}

function DoctorOnline({ featured }: { featured: FeaturedDoctor }) {
  const { doctor } = featured;
  const specialty = featured.specialty ?? doctor.specialties[0];

  return (
    <>
      <View style={styles.badge}>
        <View style={styles.dot} />
        <ThemedText style={styles.badgeText}>Online now</ThemedText>
      </View>

      <ThemedText style={styles.title}>{doctor.name} is online now.</ThemedText>
      <ThemedText type="caption" style={styles.copy}>
        They have seen you before. Book a follow-up on video, and share your record with your OTP
        when the consult starts.
      </ThemedText>

      <View style={styles.doctor}>
        <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={46} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" themeColor="onInk" numberOfLines={1}>
            {doctor.name}
          </ThemedText>
          <ThemedText type="caption" style={styles.copy} numberOfLines={1}>
            {[doctor.qualifications, specialty && specialtyLabel(specialty)]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
          <ThemedText type="caption" style={styles.faint} numberOfLines={1}>
            {history(featured)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.next}>
        <CalendarClock size={14} color={Colors.primaryLight} strokeWidth={2.4} />
        <ThemedText type="caption" style={styles.nextText}>
          {doctor.nextSlot
            ? `Next free slot: ${formatSlot(doctor.nextSlot)}`
            : `No free slots in the next ${doctor.bookingWindowDays} days`}
        </ThemedText>
      </View>

      <Button
        label={doctor.nextSlot ? 'Book appointment' : 'See their schedule'}
        icon={CalendarPlus}
        onPress={() => bookWith(featured)}
      />
    </>
  );
}

function FindADoctor() {
  return (
    <>
      <ThemedText style={styles.title}>See a doctor on video.</ThemedText>
      <ThemedText type="caption" style={styles.copy}>
        Book a general physician or a specialist. They see your record only after you share it with
        your OTP.
      </ThemedText>
      <Button
        label="Find a doctor"
        icon={Stethoscope}
        onPress={() =>
          router.push({
            pathname: '/care/doctors/[specialty]',
            params: { specialty: 'general_medicine' },
          })
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two + 2,
    padding: Spacing.three + 2,
    borderRadius: Radius.xl - 4,
  },
  loading: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.onInk,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 21,
    lineHeight: 26,
    color: Colors.onInk,
  },
  copy: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  faint: {
    color: 'rgba(255, 255, 255, 0.55)',
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    marginTop: Spacing.one,
    padding: 10,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.one,
  },
  nextText: {
    fontFamily: Fonts.semibold,
    color: Colors.primaryLight,
  },
});
