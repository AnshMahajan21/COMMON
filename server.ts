import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { attachAuthUser, prisma } from './src/server/auth';
import { apiRouter } from './src/server/routes';
import { seedDatabase } from './prisma/seed';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portFlagIndex = process.argv.indexOf('--port');
const PORT =
  portFlagIndex !== -1 && process.argv[portFlagIndex + 1]
    ? Number(process.argv[portFlagIndex + 1]) || 3000
    : 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  await seedDatabase(false);

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(attachAuthUser);

  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  });

  app.use('/api', apiRouter);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong on our server. Please try again.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`COMMON server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start COMMON server:', err);
  process.exit(1);
});
