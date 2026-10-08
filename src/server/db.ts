import { env, isProduction } from './env';
import { HttpError } from './http';
import './models';
import { mongoose } from './mongoose';

mongoose.set('strictQuery', true);

/** Kept on globalThis so hot reloads and warm instances reuse one connection. */
const cache = globalThis as typeof globalThis & {
  __mongoose?: Promise<typeof mongoose>;
  __mongooseEvents?: boolean;
};

/** How long a request waits for a dropped connection to come back before giving up. */
const RECONNECT_WAIT_MS = 5_000;

export const DB_UNAVAILABLE = 'HealthMatrix can’t reach its database right now. Try again in a moment.';

// The driver reconnects on its own after a drop (Wi-Fi change, laptop sleep, Atlas failover).
// Say so in the server log, so a stalled screen can be traced to it.
if (!cache.__mongooseEvents) {
  cache.__mongooseEvents = true;
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected, reconnecting…'));
  mongoose.connection.on('reconnected', () => console.warn('[db] reconnected'));
}

/** Resolves once the connection is up again, or false after `ms`. */
function waitForConnection(ms: number) {
  const connection = mongoose.connection;
  if (connection.readyState === 1) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const done = (up: boolean) => {
      clearTimeout(timer);
      connection.off('connected', onUp);
      connection.off('reconnected', onUp);
      resolve(up);
    };
    const onUp = () => done(true);
    const timer = setTimeout(() => done(false), ms);
    connection.on('connected', onUp);
    connection.on('reconnected', onUp);
  });
}

/**
 * Connects once, then returns the same connection to every API route. If the connection has
 * dropped since, it waits a few seconds for the driver to reconnect and otherwise fails with a
 * 503, instead of letting each query hang for Mongoose's 10-second buffering timeout.
 */
export async function connectDB() {
  cache.__mongoose ??= mongoose
    .connect(env().MONGODB_URI, {
      dbName: env().MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 10_000,
      // Build indexes on boot in development; in production create them deliberately.
      autoIndex: !isProduction(),
    })
    .catch((error: unknown) => {
      cache.__mongoose = undefined;
      console.error('[db] could not connect:', (error as Error).message);
      throw new HttpError(503, DB_UNAVAILABLE);
    });
  const connected = await cache.__mongoose;
  if (!(await waitForConnection(RECONNECT_WAIT_MS))) throw new HttpError(503, DB_UNAVAILABLE);
  return connected;
}

/** 1 = connected. Used by the health endpoint. */
export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}
