import type { Request, Response } from 'express';
import { attachErrorHandler, createApiApp } from '../src/server/app';

let cachedApp: ReturnType<typeof createApiApp>['app'] | null = null;

function getApp() {
  if (!cachedApp) {
    const { app } = createApiApp();
    attachErrorHandler(app);
    cachedApp = app;
  }
  return cachedApp;
}

export default function handler(req: Request, res: Response) {
  try {
    const app = getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel handler initialization error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server initialization failed.',
        detail: err?.message || 'Unknown startup error',
      });
    }
  }
}
