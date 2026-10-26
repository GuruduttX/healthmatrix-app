/** Domain enums. Keep in sync with `src/types/index.ts`. */

export const PLAN_IDS = ['essential', 'plus', 'family', 'senior_care', 'community'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const GENDERS = ['male', 'female', 'other'] as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const RECORD_TYPES = ['pod_screening', 'lab_report', 'prescription', 'vaccination'] as const;

/** How a record entered the locker. */
export const RECORD_SOURCES = ['pod', 'upload', 'whatsapp', 'abha', 'consult'] as const;

export const READING_FLAGS = ['normal', 'watch', 'borderline', 'high', 'low'] as const;

/** Where a QR code is carried. */
export const QR_CARRIERS = ['card', 'lock_screen', 'helmet_sticker', 'tag'] as const;

/** Fields a member can expose on the public emergency view (layer 1). */
export const EMERGENCY_FIELDS = [
  'photo',
  'bloodGroup',
  'allergies',
  'conditions',
  'medicines',
  'emergencyContacts',
  'organDonor',
  'insurance',
] as const;

export const POD_TIERS = ['arc_one', 'arc_plus', 'arc_pro', 'arc_max'] as const;

/** The Cloudspital website's enquiry statuses, shared by its admin; see `models/enquiry.model.ts`. */
export const ENQUIRY_STATUSES = ['unread', 'read', 'contacted', 'resolved'] as const;

/** What a support chat is about, picked when it starts. Mirrored in `features/support/topics.ts`. */
export const SUPPORT_TOPICS = [
  'consults',
  'pods',
  'records',
  'medicines',
  'account',
  'billing',
  'app',
  'other',
] as const;

export const POD_SITE_TYPES = [
  'residential_society',
  'corporate_campus',
  'clinic',
  'pharmacy',
  'community_centre',
  'government_health_centre',
] as const;

export const SPECIALTIES = [
  'general_medicine',
  'diabetes_endocrinology',
  'cardiology',
  'paediatrics',
  'gynaecology',
  'dermatology',
  'psychiatry',
  'nutrition',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const CONSULT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

export const CONSULT_MODES = ['video', 'video_from_pod'] as const;

/** Who called a consult off: the member here, or the doctor in the console. */
export const CANCELLED_BY = ['member', 'doctor'] as const;

export const REMINDER_KINDS = ['medicine', 'test', 'vaccine'] as const;

/** How a reminder repeats. Dates are the member's local calendar days. */
export const REMINDER_FREQUENCIES = ['once', 'daily', 'weekdays', 'interval', 'monthly'] as const;

/** When to take a medicine relative to food. */
export const MEAL_TIMINGS = ['before_food', 'after_food', 'with_food', 'empty_stomach'] as const;

export const DOSE_STATUSES = ['taken', 'skipped'] as const;

/** How a family member is related to the person who added them. Mirrors `features/family`. */
export const FAMILY_RELATIONS = [
  'spouse',
  'child',
  'parent',
  'sibling',
  'grandparent',
  'other',
] as const;

/**
 * A member's request for a custom consult time. `pending` until the doctor answers in the
 * console: `approved` creates the consult, `declined` doesn't. `withdrawn`: the member took it
 * back. A pending request whose time has passed reads as expired in the app.
 */
export const CONSULT_REQUEST_STATUSES = ['pending', 'approved', 'declined', 'withdrawn'] as const;
