import { Image } from 'expo-image';
import { router } from 'expo-router';
import { CalendarClock, CalendarPlus, Stethoscope } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot, istParts, istToday } from '@/features/doctors/time';
import { type FeaturedDoctor } from '@/features/doctors/types';
import { formatDay } from '@/features/reminders/schedule';

type DoctorHeroProps = {
  /** `undefined` while loading, `null` when none of the member's past doctors is online. */
  featured: FeaturedDoctor | null | undefined;
};

/** Lifted brand green, for the online dot. */
const ONLINE = '#22C55E';

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
 * The top of the Care tab, riding over the header. While a doctor who has seen the member before
 * is online (in a consult with anyone), it offers a follow-up with them. Otherwise it points to
 * the general physicians.
 */
export function DoctorHero({ featured }: DoctorHeroProps) {
  return (
    <View style={styles.card}>
      {featured === undefined ? (
        <HeroSkeleton />
      ) : featured ? (
        <DoctorOnline featured={featured} />
      ) : (
        <FindADoctor />
      )}
    </View>
  );
}

function HeroSkeleton() {
  return (
    <SkeletonGroup label="Checking which doctors are online" style={styles.stack}>
      <Skeleton width={96} height={22} radius={Radius.pill} />
      <View style={styles.doctor}>
        <SkeletonCircle size={52} />
        <View style={styles.flex}>
          <Skeleton width="60%" height={15} />
          <Skeleton width="45%" height={11} style={styles.gap} />
        </View>
      </View>
      <Skeleton height={48} radius={Radius.pill} />
    </SkeletonGroup>
  );
}

function DoctorOnline({ featured }: { featured: FeaturedDoctor }) {
  const { doctor } = featured;
  const specialty = featured.specialty ?? doctor.specialties[0];

  return (
    <View style={styles.stack}>
      <View style={styles.topRow}>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveText}>Online now</ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} style={styles.flex}>
          {history(featured)}
        </ThemedText>
      </View>

      <View style={styles.doctor}>
        <View>
          <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={52} />
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.flex}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {doctor.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {[doctor.qualifications, specialty && specialtyLabel(specialty)]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        They have seen you before. Book a follow-up on video, and share your record with your OTP
        when the consult starts.
      </ThemedText>

      <View style={styles.next}>
        <CalendarClock size={15} color={Colors.success} strokeWidth={2.4} />
        <ThemedText type="caption" themeColor="success" style={styles.nextText}>
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
    </View>
  );
}

function FindADoctor() {
  return (
    <View style={styles.find}>
      <View style={[styles.flex, styles.stack]}>
        <ThemedText style={styles.kicker}>Video consult</ThemedText>
        <ThemedText style={styles.title}>See a doctor on video.</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          A general physician or a specialist. They see your record only after you share it with
          your OTP.
        </ThemedText>
        <View style={styles.findAction}>
          <Button
            label="Find a doctor"
            icon={Stethoscope}
            size="sm"
            onPress={() =>
              router.push({
                pathname: '/care/doctors/[specialty]',
                params: { specialty: 'general_medicine' },
              })
            }
          />
        </View>
      </View>
      {/* Photo: Pexels (free to use), assets/images/home. */}
      <Image
        source={require('@/assets/images/home/video-consult.jpg')}
        style={styles.photo}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.lifted,
  },
  stack: {
    gap: Spacing.three - 4,
  },
  flex: {
    flex: 1,
  },
  gap: {
    marginTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSoft,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
    boxShadow: '0 0 0 3px rgba(16, 128, 109, 0.18)',
  },
  liveText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.success,
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: Colors.backgroundElement,
    backgroundColor: ONLINE,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 23,
  },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  nextText: {
    flex: 1,
    fontFamily: Fonts.semibold,
  },
  find: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  kicker: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  title: {
    marginTop: -6,
    fontFamily: Fonts.display,
    fontSize: 19,
    lineHeight: 24,
  },
  findAction: {
    alignItems: 'flex-start',
  },
  photo: {
    width: 108,
    alignSelf: 'stretch',
    minHeight: 150,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSelected,
  },
});
