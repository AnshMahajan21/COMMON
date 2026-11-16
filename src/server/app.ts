import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { attachAuthUser, prisma } from './auth';
import { apiRouter } from './routes';
import { ensureSqliteSchema } from './sqliteBootstrap';
import { seedDatabase } from '../../prisma/seed';

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await ensureSqliteSchema(prisma);
      await seedDatabase(false);
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

export function createApiApp() {
  const app = express();
  app.set('trust proxy', 1);

  // Support same-origin and preview-origin credentials & preflight requests cleanly
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  const jsonParser = express.json({ limit: '1mb' });
  app.use((req, res, next) => {
    if (req.body !== undefined && req.body !== null && typeof req.body === 'object') {
      return next();
    }
    return jsonParser(req, res, next);
  });

  app.use(cookieParser());

  app.use('/api', async (_req, _res, next) => {
    try {
      await ensureSeeded();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', attachAuthUser);

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    } catch (err: any) {
      console.error('Healthcheck error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Database check failed' });
    }
  });

  app.use('/api', apiRouter);

  // Ensure unmatched /api/* endpoints always return JSON instead of HTML 404
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return { app, ensureSeeded };
}

export function attachErrorHandler(app: express.Express) {
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Something went wrong on our server. Please try again.',
        detail: typeof err?.message === 'string' ? err.message : undefined,
        code: err?.code || undefined,
      });
    }
  });
}
