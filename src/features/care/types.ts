/** A screening pod. Matches `toPodJson` in `server/mobilab.ts`. */
export type Pod = {
  id: string;
  name: string;
  /** Street and city, for the pod's row. */
  address?: string;
  city?: string;
};

/** One test a pod can run. `code` is what a booking sends, e.g. "ALB". */
export type LabTest = {
  code: string;
  name: string;
  sampleType?: string;
};

/** Tests booked together under one name, e.g. "Liver Function Test (LFT)". */
export type LabProfile = {
  /** Its code, or "profile-<Mobilab id>" when it has none. */
  id: string;
  /** What a booking sends as `profile_codes`. Missing on some; book their tests instead. */
  code?: string;
  name: string;
  tests: { code: string; name: string }[];
};

/** Tests booked at a pod. Matches `toPodBookingJson` in `server/pod-bookings.ts`. */
export type PodBooking = {
  id: string;
  /** Our reference, e.g. "HM-7K4QX9PA"; the member can read it out at the pod. */
  reference: string;
  pod: { id: string; name: string };
  /** Health checks booked, by name. */
  profiles: string[];
  testCount: number;
  status: 'booked' | 'completed' | 'cancelled';
  /** Where it is on Mobilab, in words: "Waiting for you at the pod", "Results ready", … */
  progress: { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' };
  /** The pod screening record, once results are in. */
  recordId?: string;
  createdAt: string;
};
