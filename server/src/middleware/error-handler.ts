import { type ErrorRequestHandler, type RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { isProduction } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`));
};

/** Responds with `{ error: { message } }`, the shape the app's API client reads. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let status = 500;
  let message = 'Something went wrong';

  if (error instanceof HttpError) {
    ({ status, message } = error);
  } else if (error instanceof ZodError || error instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = error.message;
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${error.path}`;
  } else if (error?.code === 11000) {
    status = 409;
    message = 'Already exists';
  }

  if (status >= 500) console.error(error);

  res.status(status).json({
    error: { message, ...(!isProduction && status >= 500 && { detail: String(error?.message) }) },
  });
};
