import type { Request, Response } from 'express';
import { attachErrorHandler, createApiApp } from '../src/server/app';

const { app } = createApiApp();
attachErrorHandler(app);

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
