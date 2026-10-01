import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, RotateCw, Siren } from 'lucide-react-native';
import { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Plans } from '@/constants/plans';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { formatMemberId, sampleCard } from './sample-data';

type MemberCardProps = {
  member: (typeof sampleCard)['member'];
  emergencyUrl: string;
};

const FLIP_MS = 450;

/** The digital twin of the physical card. Tap to flip to the emergency QR on the back. */
export function MemberCard({ member, emergencyUrl }: MemberCardProps) {
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
        <Animated.View
          style={[styles.face, face('0deg', '180deg', true), flipped && styles.inert]}>
          <CardFront member={member} cardWidth={width} />
        </Animated.View>
        <Animated.View
          style={[styles.face, face('180deg', '360deg', false), !flipped && styles.inert]}>
          <CardBack firstName={member.firstName} emergencyUrl={emergencyUrl} cardWidth={width} />
        </Animated.View>
      </Pressable>

      <View style={styles.hint}>
        <RotateCw size={13} color={Colors.textMuted} strokeWidth={2.2} />
        <ThemedText type="caption" themeColor="textMuted">
          {flipped ? 'Tap the card to see the front' : 'Tap the card to see your emergency QR'}
        </ThemedText>
      </View>
    </View>
  );
}

/** The card is designed at this width; the member number scales with the real width. */
const DESIGN_WIDTH = 358;

function CardFront({ member, cardWidth }: { member: MemberCardProps['member']; cardWidth: number }) {
  const scale = cardWidth > 0 ? Math.min(cardWidth / DESIGN_WIDTH, 1.3) : 1;

  return (
    <LinearGradient
      colors={[Colors.inkMid, Colors.ink]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.front}>
      <Image
        source={require('@/assets/images/logo-mark.png')}
        style={styles.watermark}
        contentFit="contain"
      />

      <View style={styles.topRow}>
        <View style={styles.brand}>
          <Image
            source={require('@/assets/images/logo-mark.png')}
            style={styles.brandMark}
            contentFit="contain"
          />
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
            <BadgeCheck size={13} color={Colors.onInk} strokeWidth={2.2} />
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
          Member since {member.memberSince}   Valid thru {member.validThru}
        </ThemedText>
      </View>

      <View style={styles.bloodGroup}>
        <ThemedText style={styles.bloodGroupLabel}>Blood group</ThemedText>
        <ThemedText style={styles.bloodGroupValue}>{member.bloodGroup}</ThemedText>
      </View>
    </LinearGradient>
  );
}

type CardBackProps = { firstName: string; emergencyUrl: string; cardWidth: number };

function CardBack({ firstName, emergencyUrl, cardWidth }: CardBackProps) {
  const qrSize = Math.max(64, Math.round(cardWidth * 0.25));

  return (
    <View style={styles.back}>
      <View style={styles.backBand}>
        <Siren size={15} color={Colors.onInk} strokeWidth={2.2} />
        <ThemedText style={styles.backBandText} numberOfLines={1}>
          In an emergency, scan this code
        </ThemedText>
      </View>

      <View style={styles.backBody}>
        <View style={styles.qr}>
          {cardWidth > 0 ? (
            <QRCode value={emergencyUrl} size={qrSize} color={Colors.ink} backgroundColor="#FFFFFF" />
          ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  // Same proportions as a bank card: 85.6 x 54 mm.
  card: {
    aspectRatio: 85.6 / 54,
    borderRadius: Radius.xl - 4,
    boxShadow: Shadows.floating,
  },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.xl - 4,
    overflow: 'hidden',
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

  front: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
  },
  watermark: {
    position: 'absolute',
    right: '-11%',
    top: '24%',
    width: '44%',
    aspectRatio: 1024 / 917,
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
  brandMark: {
    width: 30,
    height: 27,
  },
  brandHealth: {
    fontFamily: Fonts.semibold,
    fontSize: 22,
    lineHeight: 24,
    color: Colors.onInk,
  },
  brandMatrix: {
    alignSelf: 'flex-end',
    marginTop: -3,
    fontFamily: Fonts.semibold,
    fontSize: 9,
    lineHeight: 11,
    color: Colors.onInk,
  },
  plan: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.onInk,
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
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.onInk,
  },
  memberId: {
    fontFamily: Fonts.bold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: 1.5,
    color: Colors.onInk,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.onInk,
  },
  dates: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    lineHeight: 13,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  bloodGroup: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  bloodGroupLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 9,
    lineHeight: 12,
    color: Colors.onInk,
  },
  bloodGroupValue: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.onInk,
  },

  back: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  backBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.primary,
  },
  backBandText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.onInk,
  },
  backBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  qr: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
  },
  backText: {
    flex: 1,
    gap: 3,
  },
  backTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.onInk,
  },
  backCopy: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    lineHeight: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  backHelplines: {
    marginTop: 2,
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    color: Colors.primaryLight,
  },
  backFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  backFootnote: {
    fontFamily: Fonts.regular,
    fontSize: 8.5,
    lineHeight: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
