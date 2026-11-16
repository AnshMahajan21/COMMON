import type { Express, Request, Response } from 'express';

let cachedApp: Express | null = null;

async function getApp(): Promise<Express> {
  if (!cachedApp) {
    const { attachErrorHandler, createApiApp } = await import('../src/server/app');
    const { app } = createApiApp();
    attachErrorHandler(app);
    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      res.once('finish', done);
      res.once('close', done);
      try {
        app(req, res);
      } catch (err) {
        if (!settled) {
          settled = true;
          reject(err);
        }
      }
    });
  } catch (err: any) {
    console.error('Vercel handler initialization error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server initialization failed.',
        detail: err?.message || 'Unknown startup error',
        code: err?.code || undefined,
      });
    }
  }
}
