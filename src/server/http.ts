import { mongoose } from './mongoose';
import { ZodError } from 'zod';

import { isProduction } from './env';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Responds with `{ error: { message } }`, the shape the app's API client reads. */
export function errorResponse(error: unknown) {
  let status = 500;
  let message = 'Something went wrong';

  if (error instanceof HttpError) {
    ({ status, message } = error);
  } else if (error instanceof ZodError) {
    // The first problem, in words the app can show as is.
    status = 400;
    message = error.issues[0]?.message ?? 'Invalid request';
  } else if (error instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(error.errors)[0]?.message ?? 'Invalid request';
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${error.path}`;
  } else if ((error as { code?: number } | null)?.code === 11000) {
    status = 409;
    message = 'Already exists';
  }

  if (status >= 500) console.error(error);

  let showDetail = false;
  try {
    showDetail = !isProduction() && status >= 500;
  } catch {
    // The environment itself is invalid; that message is the useful detail.
    showDetail = status >= 500;
  }

  return Response.json(
    {
      error: {
        message,
        ...(showDetail && { detail: String((error as Error | null)?.message) }),
      },
    },
    { status },
  );
}

/** Wraps an API route handler so thrown errors become `{ error }` JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
