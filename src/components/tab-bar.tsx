import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { type Tabs } from 'expo-router';
import { CreditCard, FileText, House, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { useEffect, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { liquidGlass } from '@/components/ui/glass';
import { Colors, Fonts, Glass, Radius, Shadows, TabBar as Metrics } from '@/constants/theme';
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
 * A floating dock of five labelled tabs, made of glass: Liquid Glass on iOS 26, a frosted pane
 * elsewhere. Monochrome, with a pane of orange-tinted glass that slides to the selected tab's icon
 * and orange only on what's selected. Ekaay is an orb inside the dock, ringed when selected instead
 * of getting the pill.
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
      {/* The shadow sits outside; the glass rounds and clips the dock's layers. */}
      <View style={styles.shadow}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="light"
          style={[styles.dock, liquidGlass ? styles.dockLiquid : styles.dockFrost]}
          accessibilityRole="tablist"
          onLayout={(event) =>
            slot.set((event.nativeEvent.layout.width - INSET * 2) / state.routes.length)
          }>
          {liquidGlass ? null : (
            // Light on the frost: brighter along the top edge, as on every pane.
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0)']}
              locations={[0, 0.6]}
              style={[StyleSheet.absoluteFill, styles.noTouch]}
            />
          )}
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
        </GlassView>
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
  // Light and cool, so the dock floats on the blue and apricot light without darkening it.
  shadow: {
    width: '100%',
    maxWidth: 460,
    borderRadius: Radius.pill,
    boxShadow:
      '0 0 0 1px rgba(44, 72, 96, 0.05), 0 2px 6px rgba(30, 50, 70, 0.05), 0 12px 32px rgba(30, 50, 70, 0.1)',
  },
  dock: {
    flexDirection: 'row',
    height: Metrics.height,
    paddingHorizontal: INSET,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  dockLiquid: {
    borderWidth: 0,
  },
  // Web blurs what's behind, so the frost can be thin; Android has no blur, so it's denser and
  // the page's text never shows through.
  dockFrost: {
    borderWidth: 1,
    borderColor: Glass.rim,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.82)',
    boxShadow: Glass.glow,
    ...(Platform.OS === 'web' ? ({ backdropFilter: Glass.blurDock } as object) : null),
  },
  noTouch: {
    pointerEvents: 'none',
  },
  // The selected tab's pill, sliding from icon to icon: orange-tinted glass with a bright rim.
  pill: {
    position: 'absolute',
    left: 0,
    bottom: BOTTOM + LABEL_HEIGHT + LABEL_GAP - 1,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 196, 160, 0.4)',
    boxShadow: `${Glass.shine}, 0 2px 8px rgba(196, 80, 20, 0.12)`,
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
