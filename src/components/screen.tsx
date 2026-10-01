import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  /** Shown at the right of the title, e.g. a Share button. */
  headerRight?: ReactNode;
  /** Rendered over the scroll area, pinned above the tab bar (e.g. a floating button). */
  floating?: ReactNode;
  children?: ReactNode;
};

/** Scrollable page shell shared by the tab screens. Leaves room for the floating tab bar. */
export function Screen({ title, subtitle, headerRight, floating, children }: ScreenProps) {
  const clearance = useTabBarClearance();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: clearance + Spacing.three + (floating ? 56 : 0) },
          ]}>
          {title ? (
            <View style={styles.titleRow}>
              <ThemedText type="title" style={styles.title}>
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
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
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
