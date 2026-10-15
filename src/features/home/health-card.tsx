import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, QrCode, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { Colors, Fonts, Glass as GlassTokens, Radius, Spacing } from '@/constants/theme';

type HealthCardProps = {
  /** Twelve digits; only the last four are shown here. */
  memberId?: string;
  abhaLinked?: boolean;
  qrOn: boolean;
  /** Where the QR is carried: "Card, lock screen and helmet tag". */
  carriers: string;
  onPress: () => void;
};

/**
 * The member's health ID as a compact credential, with the emergency QR's state: the way to the
 * card and QR, and never anything in front of it.
 */
export function HealthCard({ memberId, abhaLinked, qrOn, carriers, onPress }: HealthCardProps) {
  const masked = memberId ? `HM •••• ${memberId.slice(-4)}` : 'HealthMatrix Card';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Your health card, ending ${memberId?.slice(-4) ?? ''}. Emergency QR is ${qrOn ? 'on' : 'off'}. ${qrOn ? carriers : 'Turn it on so responders can help you'}`}
      style={({ pressed }) => pressed && styles.pressed}>
      <Glass style={styles.card}>
        {/* A small copy of the card in glass: a plain View rounds and clips its layers. */}
        <View style={styles.mini}>
          <LinearGradient
            colors={['#FFCBA9', '#C4DCF1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* A sheen, and two short lines where the card's name and number sit. */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.miniLines}>
            <View style={[styles.miniLine, { width: 18 }]} />
            <View style={[styles.miniLine, { width: 11, opacity: 0.6 }]} />
          </View>
          <View style={styles.miniQr}>
            <QrCode size={18} color={Colors.ink} strokeWidth={2.2} />
          </View>
        </View>

        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title} numberOfLines={1}>
              Emergency QR
            </ThemedText>
            <View style={[styles.state, !qrOn && styles.stateOff]}>
              <View style={[styles.dot, !qrOn && styles.dotOff]} />
              <ThemedText style={[styles.stateText, !qrOn && styles.stateTextOff]}>
                {qrOn ? 'On' : 'Off'}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.carriers} numberOfLines={2}>
            {qrOn ? carriers : 'Turn it on so responders can help you'}
          </ThemedText>
          <View style={styles.idRow}>
            <ThemedText style={styles.id} numberOfLines={1}>
              {masked}
            </ThemedText>
            {abhaLinked ? (
              <View style={styles.abha}>
                <ShieldCheck size={12} color={Colors.good} strokeWidth={2.6} />
                <ThemedText style={styles.abhaText}>ABHA linked</ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        <View>
          <ChevronRight size={20} color={Colors.textFaint} strokeWidth={2.2} />
        </View>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 2,
    padding: 14,
    paddingRight: Spacing.three - 4,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  // Card proportions (85.6 × 54 mm), small.
  // Peach to sky blue under a sheen, with a bright rim, like the banner's glass.
  mini: {
    width: 66,
    height: 44,
    borderRadius: 9,
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 6,
    borderWidth: 1,
    borderColor: GlassTokens.rim,
    boxShadow: `${GlassTokens.glowSmall}, ${GlassTokens.shadowSmall}`,
  },
  miniLines: {
    position: 'absolute',
    top: 8,
    left: 7,
    gap: 3,
  },
  miniLine: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(14, 42, 51, 0.28)',
  },
  miniQr: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    boxShadow: '0 1px 3px rgba(30, 50, 70, 0.12)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 15.5,
    lineHeight: 20,
    color: Colors.text,
  },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    backgroundColor: GlassTokens.goodTint,
  },
  stateOff: {
    backgroundColor: GlassTokens.hairline,
  },
  stateText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    color: Colors.good,
  },
  stateTextOff: {
    color: Colors.textSoft,
  },
  carriers: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  id: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: 0.3,
    color: Colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  abha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    backgroundColor: GlassTokens.goodTint,
  },
  abhaText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.good,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.good,
  },
  dotOff: {
    backgroundColor: Colors.textFaint,
  },
});
