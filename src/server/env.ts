import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  MONGODB_DB_NAME: z.string().min(1).default('healthmatrix'),
  /** Where emergency QR links point, e.g. https://healthmatrix.in/e. Read in `server/emergency.ts`. */
  EMERGENCY_BASE_URL: z.url(),
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
