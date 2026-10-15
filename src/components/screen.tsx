import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Aurora } from '@/components/ui/glass';
import { StackHeader } from '@/components/ui/stack-header';
import { Colors, Fonts, Gutter, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRefreshControl } from '@/hooks/use-refresh-control';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  /** At the right of the title, e.g. a round `HeaderIconButton` like Home's bell. */
  headerRight?: ReactNode;
  /**
   * A tab's own page, laid out like Home: a large title with a quiet line under it, and
   * `heroContent` (a search bar, filter chips) below, all scrolling over the fixed light.
   */
  hero?: boolean;
  heroContent?: ReactNode;
  /** A screen opened from a tab: a fixed bar with a round back button above the content. */
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
 * Scrollable page shell shared by the screens under the tabs, on Home's glass design: the light
 * stands still behind the page, so its panes of glass slide over it and take its tint. Leaves room
 * for the floating tab bar. Tabs use `hero`; screens opened from a tab use `onBack`.
 */
export function Screen(props: ScreenProps) {
  return props.hero ? <TabScreen {...props} /> : <StackScreen {...props} />;
}

function TabScreen({
  title,
  subtitle,
  headerRight,
  heroContent,
  floating,
  onRefresh,
  children,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const refreshControl = useRefreshControl(onRefresh);

  return (
    <View style={styles.screen}>
      <Aurora />
      {/* Starts under the status bar: the page scrolls away there instead of under the clock. */}
      <ScrollView
        style={[styles.flex, { marginTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}>
        <View
          style={[
            styles.content,
            {
              paddingTop: Spacing.three,
              paddingBottom: clearance + Spacing.four + (floating ? 56 : 0),
            },
          ]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <ThemedText style={styles.tabTitle} accessibilityRole="header" numberOfLines={1}>
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText style={styles.subtitle} numberOfLines={2}>
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>
              {headerRight}
            </View>
            {heroContent}
          </View>
          {children}
        </View>
      </ScrollView>

      {floating ? (
        <View style={[styles.floating, { bottom: clearance + Spacing.two }]}>{floating}</View>
      ) : null}
    </View>
  );
}

function StackScreen({
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
    <View style={styles.screen}>
      <Aurora />
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
            onBack ? styles.contentUnderBar : styles.contentTop,
            { paddingBottom: clearance + Spacing.four + (floating ? 56 : 0) },
          ]}>
          {title ? (
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <ThemedText style={styles.pageTitle} accessibilityRole="header">
                  {title}
                </ThemedText>
                {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
              </View>
              {headerRight}
            </View>
          ) : null}
          {children}
        </ScrollView>

        {floating ? (
          <View style={[styles.floating, { bottom: clearance + Spacing.two }]}>{floating}</View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four - 4,
    paddingHorizontal: Gutter,
  },
  contentUnderBar: {
    paddingTop: Spacing.one,
  },
  contentTop: {
    paddingTop: Spacing.three,
  },
  header: {
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  // Home's name, one step up: the page's one big line.
  tabTitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: Colors.text,
  },
  pageTitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  floating: {
    position: 'absolute',
    right: Gutter,
  },
});
