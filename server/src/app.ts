import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { apiRoutes } from './routes/index.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/v1', apiRoutes);

app.use(notFound);
app.use(errorHandler);
