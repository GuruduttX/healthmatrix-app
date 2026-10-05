import { Activity } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows } from '@/constants/theme';

import { type MapPoint, type Pod } from './sample-data';

type PodMapProps = {
  pods: Pod[];
  selectedId?: string;
  user: MapPoint;
  /** Space kept clear at the top (search bar) and bottom (the card that overlaps the map). */
  inset: { top: number; bottom: number };
  onSelect: (id: string) => void;
};

const MAP = {
  land: '#E6EDED',
  block: '#F1F5F5',
  park: '#D6E7D8',
  road: '#FFFFFF',
  water: '#D2E2EA',
  user: '#4A7C93',
};

/** City blocks as percentages of the stage; the gaps between them are the roads. */
const BLOCKS = [
  { left: 4, top: -40, width: 22, height: 26 },
  { left: 35, top: -40, width: 23, height: 26 },
  { left: 67, top: -40, width: 30, height: 26 },
  { left: 4, top: -6, width: 22, height: 30 },
  { left: 35, top: -6, width: 23, height: 30 },
  { left: 67, top: -6, width: 30, height: 30, park: true },
  { left: 4, top: 37, width: 22, height: 20, park: true },
  { left: 35, top: 37, width: 23, height: 20 },
  { left: 67, top: 37, width: 30, height: 20 },
  { left: 4, top: 69, width: 22, height: 22 },
  { left: 35, top: 69, width: 23, height: 22 },
];

const ROADS = { horizontal: [30, 62], vertical: [30, 62] };

const PIN = 30;
const PIN_SELECTED = 40;
const HIT = 48;

/**
 * Stylised neighbourhood map with a pin per pod. An illustration, not a live
 * map: positions come from the sample data until the pods API returns coordinates.
 */
export function PodMap({ pods, selectedId, user, inset, onSelect }: PodMapProps) {
  const selected = pods.find((pod) => pod.id === selectedId);

  return (
    <View style={styles.map}>
      <View style={[styles.stage, { top: inset.top, bottom: inset.bottom }]}>
        {BLOCKS.map((block, index) => (
          <View
            key={index}
            style={[
              styles.block,
              {
                left: `${block.left}%`,
                top: `${block.top}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
                backgroundColor: block.park ? MAP.park : MAP.block,
              },
            ]}
          />
        ))}

        <Svg style={styles.water} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Path d="M0 30 C 22 0, 44 55, 68 26 S 92 8, 100 22 L100 100 L0 100 Z" fill={MAP.water} />
        </Svg>

        {ROADS.horizontal.map((top) => (
          <View key={`h${top}`} style={[styles.roadHorizontal, { top: `${top}%` }]} />
        ))}
        {ROADS.vertical.map((left) => (
          <View key={`v${left}`} style={[styles.roadVertical, { left: `${left}%` }]} />
        ))}

        {selected ? (
          <Svg style={styles.route}>
            <Line
              x1={`${user.x}%`}
              y1={`${user.y}%`}
              x2={`${selected.map.x}%`}
              y2={`${selected.map.y}%`}
              stroke={MAP.user}
              strokeWidth={4}
              strokeDasharray="7 5"
            />
          </Svg>
        ) : null}

        <View style={[styles.user, { left: `${user.x}%`, top: `${user.y}%` }]} />

        {pods.map((pod) => {
          const isSelected = pod.id === selectedId;
          const size = isSelected ? PIN_SELECTED : PIN;
          return (
            <Pressable
              key={pod.id}
              onPress={() => onSelect(pod.id)}
              accessibilityRole="button"
              accessibilityLabel={`${pod.name}, ${pod.distanceKm} km`}
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.pinHit,
                {
                  left: `${pod.map.x}%`,
                  top: `${pod.map.y}%`,
                  zIndex: isSelected ? 2 : 1,
                },
              ]}>
              {isSelected ? (
                <View style={styles.labelWrap}>
                  <View style={styles.label}>
                    <ThemedText style={styles.labelText} numberOfLines={1}>
                      {pod.name}, {pod.distanceKm} km
                    </ThemedText>
                  </View>
                </View>
              ) : null}
              <View style={[styles.pin, { width: size, height: size, borderRadius: size / 2 }]}>
                <Activity size={size / 2} color={Colors.onInk} strokeWidth={2.4} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const LABEL_WIDTH = 220;

const styles = StyleSheet.create({
  map: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    backgroundColor: MAP.land,
  },
  stage: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  block: {
    position: 'absolute',
    borderRadius: Radius.sm,
  },
  water: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '78%',
    height: 200,
  },
  roadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
    marginTop: -5,
    backgroundColor: MAP.road,
  },
  // Runs past the stage so the road carries on under the search bar and the card.
  roadVertical: {
    position: 'absolute',
    top: -300,
    bottom: -40,
    width: 10,
    marginLeft: -5,
    backgroundColor: MAP.road,
  },
  route: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
  user: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: MAP.road,
    backgroundColor: MAP.user,
  },
  pinHit: {
    position: 'absolute',
    width: HIT,
    height: HIT,
    marginLeft: -HIT / 2,
    marginTop: -HIT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: MAP.road,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.card,
  },
  labelWrap: {
    position: 'absolute',
    bottom: HIT - 2,
    left: (HIT - LABEL_WIDTH) / 2,
    width: LABEL_WIDTH,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  label: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: Radius.sm,
    backgroundColor: Colors.ink,
  },
  labelText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.onInk,
  },
});
