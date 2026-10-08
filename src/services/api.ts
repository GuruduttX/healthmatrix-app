import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * The API ships with the app as Expo Router API routes (`src/app/api`). On web it is the same
 * origin. On a phone in development it is the dev server the app was loaded from; in release
 * builds a relative URL resolves against the `origin` set on the expo-router plugin.
 * Set EXPO_PUBLIC_API_URL only to point at a different deployment.
 */
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const devServer = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081"
  if (Platform.OS !== 'web' && __DEV__ && devServer) return `http://${devServer}/api/v1`;
  return '/api/v1';
}

const BASE_URL = resolveBaseUrl();

/** Full URL for an API path, e.g. a member's `photoUrl` for an <Image>. */
export function apiUrl(path: string) {
  return `${BASE_URL}${path}`;
}

let authToken: string | null = null;

/** Called by the auth provider whenever the session changes. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/** Without this a request to an unreachable server spins for a minute before the OS gives up. */
const TIMEOUT_MS = 30_000;

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // Network failures carry native stack text on iOS; show something a member can act on.
    if (controller.signal.aborted) {
      console.warn(`${rest.method ?? 'GET'} ${path} timed out after ${TIMEOUT_MS / 1000}s`);
      throw new ApiError(0, 'HealthMatrix is taking too long to answer. Try again in a moment.');
    }
    console.warn(`${rest.method ?? 'GET'} ${path} failed`, String(error));
    throw new ApiError(0, 'Could not reach HealthMatrix. Check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error?.message ?? res.statusText);
  return data as T;
}
