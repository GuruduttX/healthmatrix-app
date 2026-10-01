import { LinearGradient } from 'expo-linear-gradient';
import { type Tabs } from 'expo-router';
import {
  CreditCard,
  FileText,
  House,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react-native';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Shadows, TabBar as Metrics } from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, LucideIcon> = {
  index: House,
  records: FileText,
  ekaay: Sparkles,
  care: Stethoscope,
  card: CreditCard,
};

/** The tab that gets the raised centre button. */
const CENTER_TAB = 'ekaay';

/** Floating pill tab bar with a raised Ekaay button in the middle. */
export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  // Step out of the way while typing so the bar never sits on top of an input.
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Metrics.bottomGap) }]}>
      <View style={styles.area}>
        <View style={styles.pill} />

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key]?.options.title ?? route.name;
          const Icon = ICONS[route.name] ?? House;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          const isCenter = route.name === CENTER_TAB;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              style={({ pressed }) => [
                styles.item,
                isCenter && styles.centerItem,
                pressed && styles.pressed,
              ]}>
              {isCenter ? (
                <LinearGradient
                  colors={[Colors.primaryMid, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerButton}>
                  <Icon size={26} color={Colors.onInk} strokeWidth={2} />
                </LinearGradient>
              ) : (
                <View style={[styles.iconPill, focused && styles.iconPillFocused]}>
                  <Icon
                    size={22}
                    color={focused ? Colors.primary : Colors.textMuted}
                    strokeWidth={focused ? 2.4 : 2}
                  />
                </View>
              )}
              <ThemedText
                numberOfLines={1}
                style={[styles.label, focused && styles.labelFocused]}
                themeColor={focused ? 'primary' : 'textMuted'}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CENTER_SIZE = 58;

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
  // Taller than the pill so the raised centre button stays inside the touchable area.
  area: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    maxWidth: 460,
    height: Metrics.height + Metrics.centerLift,
    paddingHorizontal: 6,
    pointerEvents: 'box-none',
  },
  pill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: Metrics.height,
    borderRadius: Metrics.height / 2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.floating,
  },
  item: {
    flex: 1,
    minWidth: 0,
    height: Metrics.height,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  centerItem: {
    height: Metrics.height + Metrics.centerLift,
    justifyContent: 'flex-end',
    paddingBottom: 11,
    gap: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  iconPill: {
    width: 48,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillFocused: {
    backgroundColor: Colors.primarySoft,
  },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.background,
    boxShadow: Shadows.glow,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  labelFocused: {
    fontFamily: Fonts.bold,
  },
});
