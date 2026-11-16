import type { Express, Request, Response } from 'express';
import { attachErrorHandler, createApiApp } from '../src/server/app.js';

let cachedApp: Express | null = null;

function getApp(): Express {
  if (!cachedApp) {
    const { app } = createApiApp();
    attachErrorHandler(app);
    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = getApp();
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
