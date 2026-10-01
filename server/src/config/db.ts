import mongoose from 'mongoose';

import { env, isProduction } from './env.js';

mongoose.set('strictQuery', true);

mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
mongoose.connection.on('reconnected', () => console.info('[db] reconnected'));
mongoose.connection.on('error', (error) => console.error('[db] error:', error.message));

export async function connectDB() {
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
    // Build indexes on boot in development; in production create them deliberately.
    autoIndex: !isProduction,
  });
  console.info(`[db] connected to "${mongoose.connection.name}" on ${mongoose.connection.host}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

/** 1 = connected. Used by the health endpoint. */
export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}
