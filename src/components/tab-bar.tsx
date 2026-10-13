import { type Tabs } from 'expo-router';
import { CreditCard, FileText, House, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { useEffect, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { Colors, Fonts, Radius, Shadows, TabBar as Metrics } from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, LucideIcon> = {
  index: House,
  records: FileText,
  care: Stethoscope,
  card: CreditCard,
};

/** The tab that shows Ekaay's mark, the app icon in small, instead of a line icon. */
const CENTER_TAB = 'ekaay';

/** Side padding inside the dock. */
const INSET = 6;
const ORB = 32;
/** The selected tab's pill hugs its icon. */
const PILL_WIDTH = 56;
const PILL_HEIGHT = 32;
/** Space under the labels; the icons sit above them in a row of their own. */
const BOTTOM = 9;
const LABEL_HEIGHT = 14;
const LABEL_GAP = 4;

/** Quick to settle and barely overshooting: the selection moves, it doesn't bounce. */
const SPRING = { damping: 22, stiffness: 260, mass: 1 };

/**
 * A floating dock of five labelled tabs: white, monochrome, with a soft pill that slides to the
 * selected tab's icon and orange only on what's selected. Ekaay is an orb inside the dock, ringed
 * when selected instead of getting the pill.
 */
export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const keyboardVisible = useKeyboardVisible();
  const reduceMotion = useReducedMotion();
  const slot = useSharedValue(0);
  const position = useSharedValue(state.index);
  const centerSelected = state.routes[state.index]?.name === CENTER_TAB;
  const shown = useSharedValue(centerSelected ? 0 : 1);

  useEffect(() => {
    position.set(reduceMotion ? state.index : withSpring(state.index, SPRING));
    shown.set(withTiming(centerSelected ? 0 : 1, { duration: reduceMotion ? 0 : 160 }));
  }, [state.index, centerSelected, position, shown, reduceMotion]);

  const pill = useAnimatedStyle(() => ({
    opacity: slot.get() > 0 ? shown.get() : 0,
    transform: [
      { translateX: INSET + position.get() * slot.get() + (slot.get() - PILL_WIDTH) / 2 },
      { scale: 0.85 + shown.get() * 0.15 },
    ],
  }));

  // Step out of the way while typing so the bar never sits on top of an input.
  if (keyboardVisible) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Metrics.bottomGap) }]}>
      {/* The shadow sits outside; a plain View rounds and clips the dock's layers. */}
      <View style={styles.shadow}>
        <View
          style={styles.dock}
          accessibilityRole="tablist"
          onLayout={(event) =>
            slot.set((event.nativeEvent.layout.width - INSET * 2) / state.routes.length)
          }>
          <Animated.View style={[styles.pill, pill]} />

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = descriptors[route.key]?.options.title ?? route.name;
            const Icon = ICONS[route.name] ?? House;
            const isCenter = route.name === CENTER_TAB;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented)
                navigation.navigate(route.name, route.params);
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: focused }}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                <View style={styles.iconArea}>
                  {isCenter ? (
                    <View style={[styles.orbRing, focused && styles.orbRingFocused]}>
                      <EkaayMark size={ORB} />
                    </View>
                  ) : (
                    <Icon
                      size={22}
                      color={focused ? Colors.primaryDeep : Colors.textFaint}
                      strokeWidth={focused ? 2.4 : 2}
                    />
                  )}
                </View>
                <ThemedText
                  numberOfLines={1}
                  style={[styles.label, focused && styles.labelFocused]}
                  themeColor={focused ? 'primaryDeep' : 'textFaint'}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    // Let touches in the transparent area around the bar reach the screen behind it.
    pointerEvents: 'box-none',
  },
  shadow: {
    width: '100%',
    maxWidth: 460,
    borderRadius: Radius.pill,
    boxShadow: '0 2px 6px rgba(58, 36, 22, 0.06), 0 12px 32px rgba(58, 36, 22, 0.12)',
  },
  // Solid: without a real blur, see-through white only lets the page's text show through.
  dock: {
    flexDirection: 'row',
    height: Metrics.height,
    paddingHorizontal: INSET,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    overflow: 'hidden',
  },
  // The selected tab's pill, sliding from icon to icon; peach, so the orange icon reads on it.
  pill: {
    position: 'absolute',
    left: 0,
    bottom: BOTTOM + LABEL_HEIGHT + LABEL_GAP - 1,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: Colors.primaryTint,
    pointerEvents: 'none',
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: LABEL_GAP,
    paddingBottom: BOTTOM,
  },
  pressed: {
    opacity: 0.6,
  },
  // The same height for every tab, so all five labels share one baseline.
  iconArea: {
    height: PILL_HEIGHT - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A little taller than the pill, so Ekaay stands out of the row; ringed in peach when selected.
  orbRing: {
    padding: 1.5,
    borderRadius: ORB / 2 + 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
    boxShadow: Shadows.soft,
  },
  orbRingFocused: {
    borderColor: Colors.primaryLight,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    lineHeight: LABEL_HEIGHT,
  },
  labelFocused: {
    fontFamily: Fonts.bold,
  },
});
