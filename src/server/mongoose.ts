import fresh from 'mongoose';

const cache = globalThis as typeof globalThis & { __mongooseInstance?: typeof fresh };

/**
 * The one Mongoose instance all server code uses. The dev server re-evaluates an API route's
 * bundle on every request, which hands each request a new, unconnected copy of the `mongoose`
 * module. Keeping the first copy on globalThis lets the connection and the compiled models carry
 * over between requests (and between warm requests when deployed).
 */
export const mongoose = (cache.__mongooseInstance ??= fresh);

/**
 * Compiles a model on the shared instance. Model files run again on every dev request, so an
 * existing model of the same name is replaced (which also picks up schema edits) instead of
 * throwing Mongoose's "Cannot overwrite model once compiled" error.
 */
export function defineModel<TSchema extends fresh.Schema>(name: string, schema: TSchema) {
  if (mongoose.models[name]) mongoose.deleteModel(name);
  return mongoose.model(name, schema);
}
