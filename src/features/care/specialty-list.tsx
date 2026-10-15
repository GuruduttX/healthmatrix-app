import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { SPECIALTIES, type SpecialtyInfo } from '@/features/doctors/specialties';

const DISH = 56;
const PER_ROW = 4;
/**
 * How far a name may run past its dish on each side: room for "Nutrition" on one line, while the
 * names under the edge dishes stay inside the page's margins.
 */
const LABEL_SPILL = 14;

/** Four to a row, the last row padded with blanks so its dishes line up with the ones above. */
function rows(items: SpecialtyInfo[]) {
  const out: (SpecialtyInfo | null)[][] = [];
  for (let i = 0; i < items.length; i += PER_ROW) {
    const row: (SpecialtyInfo | null)[] = items.slice(i, i + PER_ROW);
    while (row.length < PER_ROW) row.push(null);
    out.push(row);
  }
  return out;
}

/**
 * The specialties on the network, laid out like Home's quick actions: an icon in a round glass
 * dish, the name under it, four to a row on the page. Tap one to see its doctors.
 */
export function SpecialtyList() {
  return (
    <View style={styles.grid}>
      {rows(SPECIALTIES).map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((specialty, i) =>
            specialty ? (
              <Item key={specialty.id} specialty={specialty} />
            ) : (
              <View key={i} style={styles.item} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function Item({ specialty: { id, label, short, icon: Icon } }: { specialty: SpecialtyInfo }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/care/doctors/[specialty]', params: { specialty: id } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${label} doctors`}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <Glass variant="small" radius={DISH / 2} style={styles.dish}>
        {/* A layer of its own, so it paints above the frost on web too. */}
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Icon size={23} color={Colors.primaryDeep} strokeWidth={2} />
        </View>
      </Glass>
      <View style={styles.labelBox}>
        <ThemedText style={styles.label} numberOfLines={2}>
          {short}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.three,
  },
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
  dish: {
    width: DISH,
    height: DISH,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
    color: Colors.text,
  },
});
