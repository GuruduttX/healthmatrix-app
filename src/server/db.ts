import { env, isProduction } from './env';
import './models';
import { mongoose } from './mongoose';

mongoose.set('strictQuery', true);

/** Kept on globalThis so hot reloads and warm instances reuse one connection. */
const cache = globalThis as typeof globalThis & { __mongoose?: Promise<typeof mongoose> };

/** Connects once, then returns the same connection to every API route. */
export function connectDB() {
  cache.__mongoose ??= mongoose
    .connect(env().MONGODB_URI, {
      dbName: env().MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 10_000,
      // Build indexes on boot in development; in production create them deliberately.
      autoIndex: !isProduction(),
    })
    .catch((error: unknown) => {
      cache.__mongoose = undefined;
      throw error;
    });
  return cache.__mongoose;
}

/** 1 = connected. Used by the health endpoint. */
export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}
