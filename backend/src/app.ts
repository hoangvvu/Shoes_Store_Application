import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';

import path from 'path';

const app = express();
app.disable('x-powered-by');
app.set('etag', false);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Cấm cache response của API (đặt trước routes)
app.use('/api/v1', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;