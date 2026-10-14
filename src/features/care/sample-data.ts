/** Position on the illustrated pod map, as a percentage of its width and height. */
export type MapPoint = { x: number; y: number };

/**
 * SAMPLE DATA for what Mobilab's API doesn't give yet. Pods come from Mobilab (`use-pod-catalog`),
 * but its clinics have an address and no coordinates, so the illustrated map pins them on these
 * spots in list order. Bookings are walk-in (Mobilab has no slots).
 */
export const MAP_SPOTS: MapPoint[] = [
  { x: 56, y: 62 },
  { x: 30, y: 30 },
  { x: 74, y: 44 },
  { x: 62, y: 16 },
  { x: 14, y: 46 },
  { x: 84, y: 74 },
];

export const sampleCare = {
  userLocation: { x: 30, y: 62 } satisfies MapPoint,
};
