import { env } from './env';
import { HttpError } from './http';

// Mobilab's partner API (https://api-staging.mobilab.ai/docs/). Each Cloudspital pod is a Mobilab
// clinic; its operators run the tests on Mobilab's app and device. The key stays on the server.

const TIMEOUT_MS = 15_000;
const NOT_SET_UP = 'Pods aren’t set up yet. Try again later.';
const UNAVAILABLE = 'Pods can’t be reached right now. Try again in a moment.';

type Page<T> = { data: T[]; meta: { total: number; offset: number; limit: number } };

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  params?: Record<string, string | number>;
  body?: unknown;
  /** What the member is told when Mobilab turns the request down (a 4xx other than auth). */
  rejected?: string;
  /** Resolve to null on a 404 instead of failing. */
  allowMissing?: boolean;
};

/** A request to Mobilab, unwrapped from its `{ data }` envelope. Failures are logged, not shown. */
async function mobilab<T>(
  path: string,
  { method = 'GET', params = {}, body, rejected, allowMissing }: RequestOptions = {},
): Promise<T> {
  const { MOBILAB_API_URL, MOBILAB_API_KEY } = env();
  if (!MOBILAB_API_KEY) throw new HttpError(503, NOT_SET_UP);

  const url = new URL(`/v1${path}`, MOBILAB_API_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${MOBILAB_API_KEY}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`[mobilab] ${method} ${path} failed:`, String(error));
    throw new HttpError(503, UNAVAILABLE);
  }

  const data = await res.json().catch(() => null);
  if (res.status === 404 && allowMissing) return null as T;
  if (!res.ok) {
    // 401: wrong or revoked key. 403: the key lacks this scope. 429: over the hourly limit.
    const { code, message, details } = data?.error ?? {};
    console.error(
      `[mobilab] ${method} ${path} -> ${res.status} ${code ?? ''}: ${message ?? res.statusText}`,
      details ? JSON.stringify(details) : '',
    );
    if (res.status === 401 || res.status === 403) throw new HttpError(503, NOT_SET_UP);
    if (rejected && res.status >= 400 && res.status < 500 && res.status !== 429) {
      throw new HttpError(422, rejected);
    }
    throw new HttpError(503, UNAVAILABLE);
  }
  return data as T;
}

/** Every page of a Mobilab list, `limit` at a time. */
async function listAll<T>(path: string, limit: number, params: Record<string, string> = {}) {
  const items: T[] = [];
  for (;;) {
    const page = await mobilab<Page<T>>(path, { params: { ...params, limit, offset: items.length } });
    items.push(...page.data);
    if (!page.data.length || items.length >= page.meta.total) return items;
  }
}

/** Keeps a list for `ms` so screens don't spend Mobilab's hourly request budget. */
function cached<T>(ms: number, load: () => Promise<T>) {
  let value: { data: T; at: number } | undefined;
  let pending: Promise<T> | undefined;
  return async () => {
    if (value && Date.now() - value.at < ms) return value.data;
    pending ??= load()
      .then((data) => {
        value = { data, at: Date.now() };
        return data;
      })
      .finally(() => (pending = undefined));
    return pending;
  };
}

type MobilabClinic = {
  id: number;
  name: string;
  phone_number?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  status?: string;
};

type MobilabTest = { name: string; code: string; sample_type?: string | null };

type MobilabProfile = {
  id: number;
  /** Missing on some profiles; those are booked by their test codes instead. */
  code?: string | null;
  name: string;
  tests?: { name: string; code: string }[];
};

/** "  gurugram " -> "Gurugram" */
const titleCase = (text?: string | null) =>
  text?.trim() ? text.trim().replace(/\b\w/g, (c) => c.toUpperCase()) : undefined;

/** A pod as the app sees it. Matches `Pod` in `features/care/types.ts`. */
function toPodJson(clinic: MobilabClinic) {
  const city = titleCase(clinic.city);
  return {
    id: String(clinic.id),
    name: clinic.name.trim(),
    address: [clinic.street_address?.trim(), city].filter(Boolean).join(', ') || undefined,
    city,
  };
}

/** Pods that take bookings: Mobilab's active clinics, by name. */
export const listPods = cached(5 * 60_000, async () => {
  const clinics = await listAll<MobilabClinic>('/clinics', 100, {
    status: 'active',
    sort_by: 'name_asc',
  });
  return clinics.map(toPodJson);
});

/**
 * The tests a pod can run, and the profiles that group them ("Liver Function Test"). Codes are
 * what a booking sends. The catalog rarely changes, so it is kept longer.
 */
export const labCatalog = cached(30 * 60_000, async () => {
  const [tests, profiles] = await Promise.all([
    listAll<MobilabTest>('/lab-tests', 200),
    listAll<MobilabProfile>('/lab-profiles', 200),
  ]);
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  return {
    tests: tests
      .map((test) => ({
        code: test.code,
        name: test.name.trim(),
        sampleType: test.sample_type ?? undefined,
      }))
      .sort(byName),
    profiles: profiles
      .map((profile) => ({
        id: profile.code || `profile-${profile.id}`,
        code: profile.code || undefined,
        name: profile.name.trim(),
        tests: (profile.tests ?? []).map((test) => ({ code: test.code, name: test.name.trim() })),
      }))
      .sort(byName),
  };
});

export type MobilabBookingRequest = {
  /** Our reference, unique across the business; Mobilab's webhook and results use it. */
  bookingId: string;
  podId: string;
  patient: { name: string; phone: string; dateOfBirth: string; sex: 'male' | 'female' };
  profileCodes: string[];
  testCodes: string[];
};

/**
 * Puts a booking in a pod's queue. No assignee is sent, so every operator of the pod sees it; the
 * member walks in and is tested whenever they arrive (Mobilab bookings have no time).
 */
type MobilabBooking = { id: string; booking_id: string; status: string };

export async function createMobilabBooking(request: MobilabBookingRequest) {
  const { data } = await mobilab<{ data: MobilabBooking }>(
    '/bookings',
    {
      method: 'POST',
      body: {
        booking_id: request.bookingId,
        patient_name: request.patient.name,
        // Mobilab wants the country code and no plus: 919876543210.
        patient_phone: `91${request.patient.phone}`,
        dob: request.patient.dateOfBirth,
        gender: request.patient.sex,
        clinic_id: Number(request.podId),
        selected_tests: { test_codes: request.testCodes, profile_codes: request.profileCodes },
      },
      rejected: 'The pod couldn’t take this booking. Try again, or pick other tests.',
    },
  );
  return data;
}

/** A booking by our reference, or null when Mobilab has none. */
export async function findMobilabBooking(bookingId: string) {
  const found = await mobilab<{ data: MobilabBooking } | null>(
    `/bookings/${encodeURIComponent(bookingId)}`,
    { allowMissing: true },
  );
  return found?.data ?? null;
}

export type MobilabRange = {
  min?: number | null;
  max?: number | null;
  gender?: string | null;
  age_min?: number | null;
  age_max?: number | null;
};

export type MobilabReading = {
  id: number;
  test_code: string;
  test_name: string;
  /** pending, accepted, rejected or retest_required. */
  status: string;
  value: number | null;
  unit?: string | null;
  method?: string | null;
  /** Objects per sex and age for measured tests; text like "35.0 - 79.5" or "< 130" for calculated ones. */
  normal_range?: (MobilabRange | string)[] | MobilabRange | string | null;
  profile_name?: string | null;
  package_name?: string | null;
  remarks?: string | null;
  category?: string | null;
};

export type MobilabResults = {
  booking_id: string;
  status: string;
  is_test_mode: boolean;
  tests: MobilabReading[];
  remarks?: string | null;
  disclaimers?: string[];
};

/** Every reading on a booking, with units, methods and reference ranges. */
export async function getMobilabResults(bookingId: string) {
  const { data } = await mobilab<{ data: MobilabResults }>(
    `/bookings/${encodeURIComponent(bookingId)}/results`,
  );
  return data;
}

/**
 * A link to the booking's PDF report, good for about an hour, or null before it is generated.
 * Fetched each time it is opened rather than stored, since the link expires.
 */
export async function getMobilabReportUrl(bookingId: string) {
  const found = await mobilab<{ data: { url: string } } | null>(
    `/reports/${encodeURIComponent(bookingId)}`,
    { allowMissing: true },
  );
  return found?.data.url ?? null;
}

/**
 * Moves a booking to another pod. Without an assignee, Mobilab hands it to every active operator
 * of the new pod and takes it off the old pod's queue. Tests can't be changed this way.
 */
export async function moveMobilabBooking(bookingId: string, podId: string) {
  const { data } = await mobilab<{ data: MobilabBooking }>(
    `/bookings/${encodeURIComponent(bookingId)}`,
    {
      method: 'PATCH',
      body: { clinic_id: Number(podId) },
      rejected: 'That pod couldn’t take this booking. Try another pod.',
    },
  );
  return data;
}
