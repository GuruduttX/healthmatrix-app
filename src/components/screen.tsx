import { useIsFocused } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeroBackground } from '@/components/ui/hero-background';
import { StackHeader } from '@/components/ui/stack-header';
import { Colors, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRefreshControl } from '@/hooks/use-refresh-control';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  /** Shown at the right of the title, e.g. a Share button. On a hero, use a glass button. */
  headerRight?: ReactNode;
  /**
   * A tab's own page: the title sits on a dark gradient header like Home's, with
   * `heroContent` (a search bar, filter chips) under it.
   */
  hero?: boolean;
  heroContent?: ReactNode;
  /** How far the first content rides up over the bottom of the hero, e.g. a card. */
  heroOverlap?: number;
  /** A screen opened from a tab: shows a bar with a round back button above the content. */
  onBack?: () => void;
  /** Where Back goes, for screen readers: "Care". */
  backLabel?: string;
  /** Short title in the back bar. The big `title` shows below it, in the page. */
  barTitle?: string;
  /** One small action at the right of the back bar. */
  barRight?: ReactNode;
  /** Rendered over the scroll area, pinned above the tab bar (e.g. a floating button). */
  floating?: ReactNode;
  /** Pulling the page down calls this to reload what it shows. */
  onRefresh?: () => Promise<unknown>;
  children?: ReactNode;
};

/**
 * Scrollable page shell shared by the screens under the tabs. Leaves room for the floating tab
 * bar. Tabs use `hero`; screens opened from a tab use `onBack`.
 */
export function Screen(props: ScreenProps) {
  return props.hero ? <HeroScreen {...props} /> : <PlainScreen {...props} />;
}

function HeroScreen({
  title,
  subtitle,
  headerRight,
  heroContent,
  heroOverlap = 0,
  floating,
  onRefresh,
  children,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  // Light status bar text over the hero, only while this screen is showing.
  const focused = useIsFocused();
  const refreshControl = useRefreshControl(onRefresh, {
    tintColor: Colors.onInk,
    progressViewOffset: insets.top,
  });

  return (
    <View style={styles.container}>
      {focused ? <StatusBar style="light" /> : null}
      {/* Dark behind the content, so pulling down shows ink above the hero (and the spinner). */}
      <ScrollView
        style={styles.darkScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        contentContainerStyle={styles.grow}>
        <View style={[styles.hero, { paddingBottom: Spacing.four + heroOverlap }]}>
          <HeroBackground />
          <View style={[styles.heroInner, { paddingTop: insets.top + Spacing.three }]}>
            <View style={styles.titleRow}>
              <ThemedText style={styles.heroTitle} accessibilityRole="header" numberOfLines={1}>
                {title}
              </ThemedText>
              {headerRight}
            </View>
            {subtitle ? <ThemedText style={styles.heroSubtitle}>{subtitle}</ThemedText> : null}
            {heroContent}
          </View>
        </View>

        <View
          style={[
            styles.lower,
            { paddingBottom: clearance + Spacing.three + (floating ? 56 : 0) },
          ]}>
          <View style={styles.bounce} />
          <View style={[styles.content, heroOverlap ? { marginTop: -heroOverlap } : null]}>
            {children}
          </View>
        </View>
      </ScrollView>

      {floating ? (
        <View style={[styles.floating, { bottom: clearance + Spacing.two }]}>{floating}</View>
      ) : null}
    </View>
  );
}

function PlainScreen({
  title,
  subtitle,
  headerRight,
  onBack,
  backLabel,
  barTitle,
  barRight,
  floating,
  onRefresh,
  children,
}: ScreenProps) {
  const clearance = useTabBarClearance();
  const refreshControl = useRefreshControl(onRefresh);

  return (
    <ThemedView style={styles.container}>
      {/* A faint warm wash at the top, so inner pages share Home's colour. */}
      <LinearGradient
        colors={['rgba(254, 241, 234, 0.9)', 'rgba(243, 247, 247, 0)']}
        style={styles.wash}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {onBack ? (
          <StackHeader onBack={onBack} backLabel={backLabel} title={barTitle} right={barRight} />
        ) : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          contentContainerStyle={[
            styles.content,
            onBack && styles.contentUnderBar,
            { paddingBottom: clearance + Spacing.three + (floating ? 56 : 0) },
          ]}>
          {title ? (
            <View style={styles.titleRow}>
              <ThemedText type="title" style={styles.title} accessibilityRole="header">
                {title}
              </ThemedText>
              {headerRight}
            </View>
          ) : null}
          {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
          {children}
        </ScrollView>

        {floating ? (
          <View style={[styles.floating, { bottom: clearance + Spacing.two }]}>{floating}</View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    backgroundColor: Colors.background,
  },
  darkScroll: {
    backgroundColor: Colors.inkDeep,
  },
  grow: {
    flexGrow: 1,
  },
  hero: {
    // Shows at the rounded bottom corners; the screen behind the hero is dark.
    backgroundColor: Colors.background,
  },
  heroInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
  },
  heroTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.onInk,
  },
  heroSubtitle: {
    marginTop: -Spacing.two,
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onInkMuted,
  },
  lower: {
    flexGrow: 1,
    backgroundColor: Colors.background,
  },
  // Light below the last section too, for the bounce at the bottom on iOS.
  bounce: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: Colors.background,
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  contentUnderBar: {
    paddingTop: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  floating: {
    position: 'absolute',
    right: Spacing.three,
  },
});
