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
export type ReminderKind = 'test' | 'vaccine' | 'consult';
export type Reminder = { id: string; kind: ReminderKind; title: string; who: string; due: string };

/**
 * SAMPLE DATA from the brochure mock-up, so the Care screen can be designed
 * before the doctors, pods, bookings and test/vaccine reminders APIs exist. The
 * doctor, pods, slots and reminders are the brochure's; the map positions are
 * placeholders. Replace with API data. Medicine reminders are real
 * (`features/reminders`).
 */
export const sampleCare = {
  doctor: {
    name: 'Dr Anjali Mehta',
    initials: 'AM',
    qualifications: 'MBBS, MD (Medicine)',
    role: 'General physician',
  },
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
  reminders: [
    { id: 'hpv', kind: 'vaccine', title: 'HPV vaccine, first dose', who: 'Anya', due: 'Due in October' },
    { id: 'lipid', kind: 'test', title: 'Lipid profile again', who: 'You', due: 'In 12 weeks' },
    { id: 'follow-up', kind: 'consult', title: 'Video follow-up', who: 'You', due: 'In 12 weeks' },
  ] satisfies Reminder[],
};
