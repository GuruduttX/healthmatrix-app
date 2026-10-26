import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  MONGODB_DB_NAME: z.string().min(1).default('healthmatrix'),
  /** Where emergency QR links point, e.g. https://healthmatrix.in/e. Read in `server/emergency.ts`. */
  EMERGENCY_BASE_URL: z.url(),
  /** Twilio Verify sends sign-in codes. Without these, codes are logged instead (see `server/otp.ts`). */
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC\w{32}$/, 'must look like AC…').optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().regex(/^VA\w{32}$/, 'must look like VA…').optional(),
  /** A Twilio API key for video consults (see `server/video.ts`), with TWILIO_ACCOUNT_SID. */
  TWILIO_API_KEY_SID: z.string().regex(/^SK\w{32}$/, 'must look like SK…').optional(),
  TWILIO_API_KEY_SECRET: z.string().min(1).optional(),
  /** Mobilab runs the tests at the pods (see `server/mobilab.ts`). Staging until production is set up. */
  MOBILAB_API_URL: z.url().default('https://api-staging.mobilab.ai'),
  /** A Mobilab API key, shown once when issued. Without it the pod screens say pods aren't set up. */
  MOBILAB_API_KEY: z.string().regex(/^(mlab|test)_\w+$/, 'must look like mlab_…').optional(),
  /**
   * The secret Mobilab signs its "report ready" webhook with (see `server/webhook-signature.ts`).
   * We make it up, 32+ characters, and share it with Mobilab securely. Without it the webhook
   * turns every call away and results arrive when the member opens the app.
   */
  MOBILAB_WEBHOOK_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
  /** Claude answers Ekaay's questions (see `server/ekaay.ts`). Without it Ekaay says it isn't set up. */
  ANTHROPIC_API_KEY: z.string().regex(/^sk-ant-/, 'must look like sk-ant-…').optional(),
  /** The Claude model Ekaay uses. */
  ANTHROPIC_MODEL: z.string().min(1).default('claude-opus-5-5'),
  /**
   * Gemini is Ekaay's voice (see `server/gemini.ts`): it hears spoken questions and reads answers
   * aloud. Without it the app reads answers with the phone's own voice and the mic is hidden.
   */
  GEMINI_API_KEY: z.string().min(1).optional(),
  /** The Gemini model that turns a spoken question into words. */
  GEMINI_TRANSCRIBE_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  /** The Gemini text-to-speech model, and one of its prebuilt voices (Sulafat is the warm one). */
  GEMINI_TTS_MODEL: z.string().min(1).default('gemini-3.8-flash-tts'),
  GEMINI_TTS_VOICE: z.string().min(1).default('Sulafat'),
  /**
   * Ekaay's limits in the app (see `server/ekaay-limits.ts`), reset at midnight India time:
   * questions a day on the free Essential plan and on the paid plans, questions a minute per
   * member, and questions a day across the whole app, a ceiling on cost.
   */
  EKAAY_FREE_PER_DAY: z.coerce.number().int().positive().default(10),
  EKAAY_PAID_PER_DAY: z.coerce.number().int().positive().default(50),
  EKAAY_PER_MINUTE: z.coerce.number().int().positive().default(5),
  EKAAY_APP_PER_DAY: z.coerce.number().int().positive().default(2000),
});

let cached: z.infer<typeof schema> | undefined;

/** Server-only settings. Read lazily so a missing value fails the request, not the bundle. */
export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      'Invalid server environment (set it in .env, or as EAS environment variables when deployed):\n' +
        z.prettifyError(parsed.error),
    );
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === 'production';
