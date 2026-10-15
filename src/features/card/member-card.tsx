import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, RotateCw, Siren } from 'lucide-react-native';
import { useId, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Glass, glassSurface } from '@/components/ui/glass';
import { LogoMark } from '@/components/ui/logo-mark';
import { Skeleton } from '@/components/ui/skeleton';
import { Plans } from '@/constants/plans';
import { Colors, Fonts, Glass as GlassTokens, Radius, Spacing } from '@/constants/theme';
import { type BloodGroup, type PlanId } from '@/types';

import { formatMemberId } from './sample-data';

/** What the card prints. Dates are already "MM/YY". */
export type CardMember = {
  name: string;
  firstName: string;
  memberId: string;
  plan: PlanId;
  bloodGroup?: BloodGroup;
  memberSince: string;
  validThru?: string;
  abhaLinked: boolean;
};

type MemberCardProps = {
  member: CardMember;
  /** The member's emergency link; null while it loads. */
  emergencyUrl: string | null;
  /** Shown on the back when there is no link to show. */
  emergencyError?: string | null;
};

const FLIP_MS = 450;

/** Same proportions as a bank card: 85.6 x 54 mm. */
const RATIO = 85.6 / 54;
const RADIUS = Radius.xl - 4;

/**
 * The digital twin of the physical card, as a frosted glass card like Home's banner. Tap to flip
 * to the emergency QR on the back.
 */
export function MemberCard({ member, emergencyUrl, emergencyError }: MemberCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [width, setWidth] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));

  const flip = () => {
    Animated.timing(progress, {
      toValue: flipped ? 0 : 1,
      duration: FLIP_MS,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    setFlipped(!flipped);
  };

  // Each face turns through 180 degrees and swaps visibility at the halfway point.
  const face = (from: string, to: string, visibleFirst: boolean) => ({
    opacity: progress.interpolate({
      inputRange: [0, 0.499, 0.5, 1],
      outputRange: visibleFirst ? [1, 1, 0, 0] : [0, 0, 1, 1],
    }),
    transform: [
      { perspective: 1200 },
      { rotateY: progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) },
    ],
  });

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={flip}
        accessibilityRole="button"
        accessibilityLabel={
          flipped ? 'Emergency QR side of your card. Tap to flip.' : 'Your card. Tap to see the emergency QR.'
        }
        style={styles.card}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Animated.View style={[styles.face, face('0deg', '180deg', true), flipped && styles.inert]}>
          <CardFront member={member} cardWidth={width} />
        </Animated.View>
        <Animated.View
          style={[styles.face, face('180deg', '360deg', false), !flipped && styles.inert]}>
          <CardBack
            firstName={member.firstName}
            emergencyUrl={emergencyUrl}
            emergencyError={emergencyError}
            cardWidth={width}
          />
        </Animated.View>
      </Pressable>

      <View style={styles.hint}>
        <RotateCw size={13} color={Colors.textFaint} strokeWidth={2.2} />
        <ThemedText style={styles.hintText}>
          {flipped ? 'Tap the card to see the front' : 'Tap the card to see your emergency QR'}
        </ThemedText>
      </View>
    </View>
  );
}

/** The card is designed at this width; the member number scales with the real width. */
const DESIGN_WIDTH = 358;

/**
 * Light inside the card's glass, as in Home's banner: warm peach gathering at the top right, where
 * the mark is etched, and sky blue rising from the bottom left under the number. Then a glint
 * across the middle, like light on a laminated card.
 */
function CardLight({ width }: { width: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const height = width / RATIO;
  const peach = { cx: width * 0.84, cy: height * 0.3, r: width * 0.52 };
  const sky = { cx: 0, cy: height, r: width * 0.64 };

  return (
    <>
      <Svg width={width} height={height} style={styles.light} pointerEvents="none">
        <Defs>
          <RadialGradient id={`${id}sky`} {...sky} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#C9E1F4" stopOpacity={0.9} />
            <Stop offset="0.55" stopColor="#C9E1F4" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#C9E1F4" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}peach`} {...peach} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFD6BC" stopOpacity={0.78} />
            <Stop offset="0.55" stopColor="#FFD6BC" stopOpacity={0.32} />
            <Stop offset="1" stopColor="#FFD6BC" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle {...sky} fill={`url(#${id}sky)`} />
        <Circle {...peach} fill={`url(#${id}peach)`} />
      </Svg>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
        locations={[0.38, 0.5, 0.64]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.noTouch]}
      />
    </>
  );
}

function CardFront({ member, cardWidth }: { member: MemberCardProps['member']; cardWidth: number }) {
  const scale = cardWidth > 0 ? Math.min(cardWidth / DESIGN_WIDTH, 1.3) : 1;

  return (
    <Glass style={styles.front} wrapperStyle={styles.flex} radius={RADIUS} tinted={false}>
      {cardWidth > 0 ? <CardLight width={cardWidth} /> : null}
      {/* The mark etched into the glass, in white, over the peach light. */}
      {cardWidth > 0 ? (
        <View style={styles.watermark}>
          <LogoMark
            size={cardWidth * 0.46}
            scale={0.95}
            colors={['#FFFFFF', '#FFFFFF', '#FFFFFF']}
            opacities={[0.72, 0.6, 0.5]}
          />
        </View>
      ) : null}

      <View style={styles.topRow}>
        <View style={styles.brand}>
          <LogoMark size={32} scale={0.94} />
          <View>
            <ThemedText style={styles.brandHealth}>Health</ThemedText>
            <ThemedText style={styles.brandMatrix}>Matrix</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.plan}>{Plans[member.plan].name}</ThemedText>
      </View>

      <View style={styles.details}>
        {member.abhaLinked ? (
          <View style={styles.abha}>
            <BadgeCheck size={13} color={Colors.good} strokeWidth={2.4} />
            <ThemedText style={styles.abhaText}>ABHA linked</ThemedText>
          </View>
        ) : null}
        <ThemedText
          style={[
            styles.memberId,
            { fontSize: 19 * scale, lineHeight: 24 * scale, letterSpacing: 1.5 * scale },
          ]}
          numberOfLines={1}>
          {formatMemberId(member.memberId)}
        </ThemedText>
        <ThemedText style={[styles.name, styles.besideBadge]} numberOfLines={1}>
          {member.name}
        </ThemedText>
        <ThemedText style={[styles.dates, styles.besideBadge]} numberOfLines={1}>
          Member since {member.memberSince}
          {member.validThru ? `  ·  Valid thru ${member.validThru}` : ''}
        </ThemedText>
      </View>

      {member.bloodGroup ? (
        <View style={[glassSurface.small, styles.bloodGroup]}>
          <ThemedText style={styles.bloodGroupLabel}>Blood group</ThemedText>
          <ThemedText style={styles.bloodGroupValue}>{member.bloodGroup}</ThemedText>
        </View>
      ) : null}
    </Glass>
  );
}

type CardBackProps = {
  firstName: string;
  emergencyUrl: string | null;
  emergencyError?: string | null;
  cardWidth: number;
};

function CardBack({ firstName, emergencyUrl, emergencyError, cardWidth }: CardBackProps) {
  const qrSize = Math.max(64, Math.round(cardWidth * 0.25));

  return (
    <Glass style={styles.back} wrapperStyle={styles.flex} radius={RADIUS} tinted={false}>
      {cardWidth > 0 ? <CardLight width={cardWidth} /> : null}
      <View style={styles.backBand}>
        <Siren size={15} color={Colors.high} strokeWidth={2.4} />
        <ThemedText style={styles.backBandText} numberOfLines={1}>
          In an emergency, scan this code
        </ThemedText>
      </View>

      <View style={styles.backBody}>
        <View style={[styles.qr, { width: qrSize + 12, height: qrSize + 12 }]}>
          {cardWidth > 0 && emergencyUrl ? (
            <QRCode
              value={emergencyUrl}
              size={qrSize}
              color={Colors.text}
              backgroundColor={Colors.backgroundElement}
            />
          ) : emergencyError ? (
            <ThemedText style={styles.qrError}>QR unavailable. Check your connection.</ThemedText>
          ) : (
            <Skeleton width={qrSize} height={qrSize} radius={Radius.sm} />
          )}
        </View>
        <View style={styles.backText}>
          <ThemedText style={styles.backTitle}>{firstName}’s emergency profile</ThemedText>
          <ThemedText style={styles.backCopy}>
            Blood group, allergies, medicines and family contacts. Opens on any phone camera.
          </ThemedText>
          <ThemedText style={styles.backHelplines}>Emergency 112   Ambulance 108</ThemedText>
        </View>
      </View>

      <View style={styles.backFooter}>
        <ThemedText style={styles.backFootnote}>HealthMatrix LLP</ThemedText>
        <ThemedText style={styles.backFootnote}>Found this card? Scan to return it.</ThemedText>
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three - 4,
  },
  card: {
    aspectRatio: RATIO,
    borderRadius: RADIUS,
  },
  // Each face is a whole pane of glass with its own lift, so the shadow turns with the card.
  face: {
    ...StyleSheet.absoluteFill,
  },
  flex: {
    flex: 1,
  },
  noTouch: {
    pointerEvents: 'none',
  },
  light: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  inert: {
    pointerEvents: 'none',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hintText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },

  front: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
  },
  watermark: {
    position: 'absolute',
    right: '-12%',
    top: '20%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandHealth: {
    fontFamily: Fonts.semibold,
    fontSize: 22,
    lineHeight: 24,
    color: Colors.text,
  },
  brandMatrix: {
    alignSelf: 'flex-end',
    marginTop: -3,
    fontFamily: Fonts.semibold,
    fontSize: 9,
    lineHeight: 11,
    color: Colors.text,
  },
  // The card's one orange word, beside the mark.
  plan: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: Colors.primaryDeep,
  },
  details: {
    gap: 2,
  },
  // Name and dates share their rows with the blood group badge.
  besideBadge: {
    paddingRight: 76,
  },
  abha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  abhaText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
    color: Colors.good,
  },
  memberId: {
    fontFamily: Fonts.bold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: 1.5,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.text,
  },
  dates: {
    fontFamily: Fonts.medium,
    fontSize: 10.5,
    lineHeight: 14,
    color: Colors.textSoft,
    fontVariant: ['tabular-nums'],
  },
  // A small pill of glass on the card.
  bloodGroup: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  bloodGroupLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 9,
    lineHeight: 12,
    color: Colors.textSoft,
  },
  bloodGroupValue: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.high,
  },

  back: {
    flex: 1,
  },
  // A band of the alert crimson across the top, see-through so it takes the glass's light; never
  // the brand orange.
  backBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GlassTokens.hairline,
    backgroundColor: GlassTokens.highTint,
  },
  backBandText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.high,
  },
  backBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  // Solid white under the code, whatever the glass shows: scanners need the contrast.
  qr: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundElement,
    boxShadow: GlassTokens.shadowSmall,
  },
  qrError: {
    fontFamily: Fonts.semibold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: Colors.text,
  },
  backText: {
    flex: 1,
    gap: 3,
  },
  backTitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: -0.2,
    color: Colors.text,
  },
  backCopy: {
    fontFamily: Fonts.medium,
    fontSize: 10.5,
    lineHeight: 14,
    color: Colors.textSoft,
  },
  backHelplines: {
    marginTop: 2,
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    color: Colors.text,
  },
  backFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  backFootnote: {
    fontFamily: Fonts.medium,
    fontSize: 8.5,
    lineHeight: 11,
    color: Colors.textFaint,
  },
});
