import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  CalendarClock,
  CalendarPlus,
  CalendarSearch,
  Radio,
  Stethoscope,
} from 'lucide-react-native';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { PillButton } from '@/features/doctors/consult-actions';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot, istParts, istToday } from '@/features/doctors/time';
import { type FeaturedDoctor } from '@/features/doctors/types';
import { formatDay } from '@/features/reminders/schedule';

type DoctorHeroProps = {
  /** `undefined` while loading, `null` when none of the member's past doctors is online. */
  featured: FeaturedDoctor | null | undefined;
};

/** The doctor's photo, and the dish at the start of the card when there is no doctor to show. */
const LEAD = 48;
/** The slot line's lead, as on Home's Today card. */
const LINE_LEAD = 34;

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

const findGeneralPhysician = () =>
  router.push({ pathname: '/care/doctors/[specialty]', params: { specialty: 'general_medicine' } });

/**
 * The top of the Care tab, a sibling of Home's Today card. While a doctor who has seen the member
 * before is online (in a consult with anyone), it offers a follow-up with them. Otherwise it
 * points to the general physicians.
 */
export function DoctorHero({ featured }: DoctorHeroProps) {
  return (
    <Shell>
      {featured === undefined ? (
        <HeroSkeleton />
      ) : featured ? (
        <DoctorOnline featured={featured} />
      ) : (
        <FindADoctor />
      )}
    </Shell>
  );
}

/** White, with a faint warm light in the top right corner, like Today on Home. */
function Shell({ children }: { children: ReactNode }) {
  return (
    // The shadow sits outside the card, which clips its corners and gradient.
    <View style={styles.shadow}>
      <View style={styles.card}>
        <LinearGradient
          colors={['rgba(250, 190, 160, 0.3)', 'rgba(250, 190, 160, 0)']}
          locations={[0, 0.5]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.3, y: 0.7 }}
          style={[StyleSheet.absoluteFill, styles.noTouch]}
        />
        {children}
      </View>
    </View>
  );
}

function HeroSkeleton() {
  return (
    <SkeletonGroup label="Checking which doctors are online">
      <View style={styles.header}>
        <SkeletonCircle size={LEAD} />
        <View style={[styles.flex, styles.skeletonText]}>
          <Skeleton width="55%" height={15} />
          <Skeleton width="75%" height={11} />
        </View>
      </View>
      <View style={[styles.skeletonText, styles.body]}>
        <Skeleton height={11} />
        <Skeleton width="70%" height={11} />
      </View>
      <View style={styles.rule} />
      <View style={styles.line}>
        <SkeletonCircle size={LINE_LEAD} />
        <View style={[styles.flex, styles.skeletonText]}>
          <Skeleton width="45%" height={13} />
          <Skeleton width="30%" height={10} />
        </View>
        <Skeleton width={76} height={32} radius={Radius.pill} />
      </View>
    </SkeletonGroup>
  );
}

function DoctorOnline({ featured }: { featured: FeaturedDoctor }) {
  const { doctor } = featured;
  const specialty = featured.specialty ?? doctor.specialties[0];
  const about = [specialty && specialtyLabel(specialty), doctor.qualifications]
    .filter(Boolean)
    .join(' · ');
  const slot = doctor.nextSlot ? formatSlot(doctor.nextSlot) : null;

  return (
    <>
      <View style={styles.header}>
        <View>
          <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={LEAD} />
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.flex}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {doctor.name}
          </ThemedText>
          <ThemedText style={styles.about} numberOfLines={1}>
            {about}
          </ThemedText>
          {/* The word and an icon, so no one has to read the colour. */}
          <View style={styles.online}>
            <Radio size={13} color={Colors.good} strokeWidth={2.4} />
            <ThemedText style={styles.onlineText} numberOfLines={1}>
              Online now
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <ThemedText style={styles.bodyText}>
          They have seen you before. Book a follow-up on video, and share your record with your OTP
          when the consult starts.
        </ThemedText>
        <ThemedText style={styles.history} numberOfLines={1}>
          {history(featured)}
        </ThemedText>
      </View>

      <View style={styles.rule} />

      {/* The card's one action, at the end of the slot it books. */}
      <View style={styles.line}>
        <IconTile icon={CalendarClock} size={LINE_LEAD} />
        <View style={styles.flex}>
          <ThemedText style={styles.lineTitle} numberOfLines={slot ? 1 : 2}>
            {slot ?? `No free slots in the next ${doctor.bookingWindowDays} days`}
          </ThemedText>
          {slot ? <ThemedText style={styles.lineSubtitle}>Next free slot</ThemedText> : null}
        </View>
        {slot ? (
          <PillButton
            label="Book"
            icon={CalendarPlus}
            solid
            onPress={() => bookWith(featured)}
            accessibilityLabel={`Book appointment with ${doctor.name}, next free slot ${slot}`}
          />
        ) : (
          <PillButton
            label="Schedule"
            icon={CalendarSearch}
            onPress={() => bookWith(featured)}
            accessibilityLabel={`See ${doctor.name}’s schedule`}
          />
        )}
      </View>
    </>
  );
}

function FindADoctor() {
  return (
    <>
      <View style={styles.header}>
        {/* Home's Consult doctor (see assets/images/home/CREDITS), in the same dish. */}
        <View style={styles.dish}>
          <LinearGradient
            colors={Gradients.dish}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* A layer of its own, so it paints above the gradient on web too. */}
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Image
              source={require('@/assets/images/home/actions/consult.png')}
              style={styles.portrait}
              contentFit="contain"
              accessibilityIgnoresInvertColors
              aria-hidden
            />
          </View>
        </View>
        <View style={styles.flex}>
          <ThemedText style={styles.kicker}>Video consult</ThemedText>
          <ThemedText style={styles.name} accessibilityRole="header">
            See a doctor on video
          </ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        <ThemedText style={styles.bodyText}>
          A general physician or a specialist. They see your record only after you share it with
          your OTP.
        </ThemedText>
      </View>

      <View style={styles.findAction}>
        <PillButton
          label="Find a doctor"
          icon={Stethoscope}
          solid
          onPress={findGeneralPhysician}
          accessibilityLabel="Find a doctor"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTouch: {
    pointerEvents: 'none',
  },
  shadow: {
    borderRadius: Radius.xl,
    boxShadow: Shadows.soft,
  },
  card: {
    paddingHorizontal: Spacing.three - 2,
    paddingTop: Spacing.three - 2,
    paddingBottom: Spacing.three - 6,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundElement,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  name: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 17.5,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  about: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  online: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineText: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.good,
  },
  // A dot on the photo backs up the word, in the same teal-blue.
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.good,
  },
  body: {
    gap: 4,
    marginTop: Spacing.three - 4,
  },
  bodyText: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  history: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  // Edge to edge, as under Today's header on Home.
  rule: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.three - 2,
    marginHorizontal: -(Spacing.three - 2),
    backgroundColor: Colors.hairline,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingTop: Spacing.two + 2,
    paddingBottom: 2,
  },
  lineTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 18.5,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  lineSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSoft,
  },
  dish: {
    width: LEAD,
    height: LEAD,
    borderRadius: LEAD / 2,
    overflow: 'hidden',
  },
  // A portrait: large and low, so the face fills the dish and its edge crops the coat.
  portrait: {
    width: LEAD * 1.25 * (300 / 291),
    height: LEAD * 1.25,
    transform: [{ translateY: LEAD * 0.17 }],
  },
  kicker: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.primaryDeep,
  },
  findAction: {
    alignItems: 'flex-start',
    marginTop: Spacing.three - 2,
    marginBottom: 4,
  },
  skeletonText: {
    gap: 8,
  },
});
