import { router } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { PodBooking } from '@/features/care/pod-booking';
import { PodMap } from '@/features/care/pod-map';
import { sampleCare } from '@/features/care/sample-data';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

const MAP_HEIGHT = 300;
const BAR_HEIGHT = 44;
/** How far the pod card rides up over the bottom of the map. */
const CARD_OVERLAP = 44;

/** Pod finder: nearby pods on a map, with slots and booking for the test that is due. */
export default function PodsScreen() {
  const { pods, booking, area, userLocation } = sampleCare;
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();

  const [podId, setPodId] = useState(pods[0]?.id);
  const [slot, setSlot] = useState(booking.slots[0]);

  const barTop = insets.top + Spacing.two;
  const mapHeight = barTop + BAR_HEIGHT + MAP_HEIGHT;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: clearance + Spacing.three }}>
        <View style={{ height: mapHeight }}>
          <PodMap
            pods={pods}
            selectedId={podId}
            user={userLocation}
            inset={{
              top: barTop + BAR_HEIGHT + Spacing.two,
              bottom: CARD_OVERLAP,
            }}
            onSelect={setPodId}
          />

          <View style={[styles.bar, { top: barTop }]}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to Care"
              hitSlop={6}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <ChevronLeft size={20} color={Colors.text} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.search}>
              <Search size={16} color={Colors.textMuted} strokeWidth={2.2} />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                Pods near {area}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          <PodBooking
            pods={pods}
            booking={booking}
            podId={podId}
            slot={slot}
            onSelectPod={setPodId}
            onSelectSlot={setSlot}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  back: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: BAR_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.75,
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginTop: -CARD_OVERLAP,
    paddingHorizontal: Spacing.three,
  },
});
