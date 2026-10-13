import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Gradients, Radius, Shadows } from '@/constants/theme';

import { type MapPoint, type Pod } from './sample-data';

type PodMapProps = {
  pods: Pod[];
  selectedId?: string;
  user: MapPoint;
  /** Space kept clear at the top (search bar) and bottom (the card that overlaps the map). */
  inset: { top: number; bottom: number };
  onSelect: (id: string) => void;
};

/** A warm paper map: sand land, ivory blocks, muted sage parks, white roads, soft water. */
const MAP = {
  land: '#EFE7DC',
  block: '#F8F3EC',
  park: '#E2E6D3',
  road: '#FFFFFF',
  water: '#D9E4E4',
};

/** The Arc pod from the HealthMatrix brochure; see assets/images/home/3d/LICENSE. */
const POD_ART = require('@/assets/images/home/3d/pod.png');
const POD_ASPECT = 274 / 420;

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

/**
 * The chosen pod's name goes under its pin, where it covers the least, unless another pin sits
 * just below; then it goes above. Numbers are percentages of the map, like the pins'.
 */
function labelBelow(pod: Pod, pods: Pod[]) {
  return !pods.some(
    (other) =>
      other.id !== pod.id &&
      Math.abs(other.map.x - pod.map.x) < 28 &&
      other.map.y > pod.map.y &&
      other.map.y - pod.map.y < 24,
  );
}

const PIN = 26;
const PIN_SELECTED = 46;
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
          // Sized to the stage, so the percentages land on the pins.
          <Svg width="100%" height="100%" style={styles.route}>
            <Line
              x1={`${user.x}%`}
              y1={`${user.y}%`}
              x2={`${selected.map.x}%`}
              y2={`${selected.map.y}%`}
              stroke={Colors.primary}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray="0.1 8"
            />
          </Svg>
        ) : null}

        {/* You are here: an ink dot in a white ring on a faint halo. */}
        <View style={[styles.userHalo, { left: `${user.x}%`, top: `${user.y}%` }]}>
          <View style={styles.user} />
        </View>

        {pods.map((pod) => {
          const isSelected = pod.id === selectedId;
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
                <>
                  <View
                    style={[
                      styles.labelWrap,
                      labelBelow(pod, pods) ? styles.labelBelow : styles.labelAbove,
                    ]}>
                    <View style={styles.label}>
                      <ThemedText style={styles.labelText} numberOfLines={1}>
                        {pod.name} · {pod.distanceKm} km
                      </ThemedText>
                    </View>
                  </View>
                  {/* The chosen pod: its picture in a white dish. The shadow sits outside. */}
                  <View style={styles.pinSelectedShadow}>
                    <View style={styles.pinSelected}>
                      <LinearGradient
                        colors={Gradients.dish}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 0.8, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={[StyleSheet.absoluteFill, styles.center]}>
                        <Image
                          source={POD_ART}
                          style={styles.podArt}
                          contentFit="contain"
                          accessibilityIgnoresInvertColors
                          aria-hidden
                        />
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.pin}>
                  <Activity size={12} color={Colors.onInk} strokeWidth={2.8} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* The map melts into the page under the card instead of ending at an edge. */}
      <LinearGradient
        colors={['rgba(248, 245, 240, 0)', Colors.canvas]}
        style={[styles.fade, { height: inset.bottom + 36 }]}
      />
    </View>
  );
}

const LABEL_WIDTH = 240;

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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    position: 'absolute',
    borderRadius: Radius.md,
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
    left: 0,
    pointerEvents: 'none',
  },
  userHalo: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 36, 22, 0.1)',
  },
  user: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: MAP.road,
    backgroundColor: Colors.ink,
    boxShadow: Shadows.dish,
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
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: MAP.road,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.dish,
  },
  pinSelectedShadow: {
    borderRadius: PIN_SELECTED / 2,
    boxShadow: Shadows.raised,
  },
  pinSelected: {
    width: PIN_SELECTED,
    height: PIN_SELECTED,
    borderRadius: PIN_SELECTED / 2,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: MAP.road,
  },
  // Framed like Home's pod: large and cut at the floor, so the arch and seat fill the dish.
  podArt: {
    width: PIN_SELECTED * 1.1 * POD_ASPECT,
    height: PIN_SELECTED * 1.1,
    transform: [{ translateY: PIN_SELECTED * 0.14 }],
  },
  labelWrap: {
    position: 'absolute',
    left: (HIT - LABEL_WIDTH) / 2,
    width: LABEL_WIDTH,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  labelBelow: {
    top: HIT + 2,
  },
  labelAbove: {
    bottom: HIT + 2,
  },
  label: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  labelText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    color: Colors.text,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
});
