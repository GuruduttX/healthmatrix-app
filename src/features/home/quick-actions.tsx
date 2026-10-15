import { useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { ConsultIcon, MedicinesIcon, PodIcon, RecordsIcon } from './action-icons';

export type QuickActionId = 'video-consult' | 'book-pod' | 'medicines' | 'add-records';

type Action = {
  id: QuickActionId;
  label: string;
  /** What a screen reader says for the button. */
  spoken: string;
  Icon: (props: { size: number }) => React.ReactNode;
};

const ACTIONS: Action[] = [
  { id: 'video-consult', label: 'Consult', spoken: 'Video consult', Icon: ConsultIcon },
  { id: 'book-pod', label: 'Book pod', spoken: 'Book a screening pod', Icon: PodIcon },
  { id: 'medicines', label: 'Medicines', spoken: 'Medicines', Icon: MedicinesIcon },
  { id: 'add-records', label: 'Records', spoken: 'Records', Icon: RecordsIcon },
];

const DISH = 64;
const ICON = 36;
/** How far a name may run past its dish on each side, so "Medicines" is never cut short. */
const LABEL_SPILL = 14;

/**
 * A round of clear glass: the page shows through it (blurred on web), peach and sky-blue light
 * play inside it, and the icon's orange spreads softly behind the icon, as through frosted glass.
 */
function GlassDish({ Icon }: { Icon: Action['Icon'] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Glass variant="small" radius={DISH / 2} tinted style={styles.dish}>
      <Svg width={DISH} height={DISH} style={styles.haze} pointerEvents="none">
        <Defs>
          <RadialGradient
            id={id}
            cx={DISH / 2}
            cy={DISH / 2 + 3}
            r={DISH * 0.4}
            gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFC29C" stopOpacity={0.6} />
            <Stop offset="0.55" stopColor="#FFC29C" stopOpacity={0.2} />
            <Stop offset="1" stopColor="#FFC29C" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={DISH / 2} cy={DISH / 2 + 3} r={DISH * 0.4} fill={`url(#${id})`} />
      </Svg>
      {/* A layer of its own, so it paints above the frost on web too. */}
      <View style={styles.icon}>
        <Icon size={ICON} />
      </View>
    </Glass>
  );
}

/** The four everyday services on Home: a glass icon in a round of clear glass, the name under it. */
export function QuickActions({ onPress }: { onPress: (id: QuickActionId) => void }) {
  return (
    <View style={styles.row}>
      {ACTIONS.map(({ id, label, spoken, Icon }) => (
        <Pressable
          key={id}
          onPress={() => onPress(id)}
          accessibilityRole="button"
          accessibilityLabel={spoken}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <GlassDish Icon={Icon} />
          <View style={styles.labelBox}>
            <ThemedText style={styles.label} numberOfLines={1}>
              {label}
            </ThemedText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // The first and last dishes sit on the page's edges, in line with every other section.
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    width: DISH,
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  // Clearer than the other small glass, so the page shows through.
  dish: {
    width: DISH,
    height: DISH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  haze: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  // Wider than the dish and centred under it; the row's spacing still follows the dishes.
  labelBox: {
    width: DISH + LABEL_SPILL * 2,
    marginHorizontal: -LABEL_SPILL,
    alignItems: 'center',
  },
  label: {
    maxWidth: '100%',
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
});
