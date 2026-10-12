/** Position on the illustrated pod map, as a percentage of its width and height. */
export type MapPoint = { x: number; y: number };
export type Pod = {
  id: string;
  name: string;
  tier: string;
  hours: string;
  distanceKm: number;
  map: MapPoint;
};

/**
 * SAMPLE DATA from the brochure mock-up, so the Care screen can be designed
 * before the pods and bookings APIs exist. The pods and slots are the
 * brochure's; the map positions are placeholders. Replace with API data.
 * Doctors, appointments, medicine reminders and vaccines are real.
 */
export const sampleCare = {
  pods: [
    { id: 'sector-1', name: 'Sector 1 clubhouse', tier: 'Arc Max', hours: 'Open till 8 pm', distanceKm: 0.4, map: { x: 56, y: 62 } },
    { id: 'market-street', name: 'Market Street pharmacy', tier: 'Arc Pro', hours: 'Open till 10 pm', distanceKm: 1.3, map: { x: 30, y: 30 } },
    { id: 'tech-park', name: 'Tech park, Block B', tier: 'Arc Plus', hours: 'Weekdays', distanceKm: 2.6, map: { x: 74, y: 44 } },
  ] satisfies Pod[],
  area: 'Sector 1',
  userLocation: { x: 30, y: 62 } satisfies MapPoint,
  booking: {
    test: 'HbA1c',
    day: 'Saturday',
    slots: ['8:30 am', '9:00 am', '9:30 am', '10:00 am'],
  },
};
