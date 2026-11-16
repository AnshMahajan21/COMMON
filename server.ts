import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { attachErrorHandler, createApiApp } from './src/server/app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portFlagIndex = process.argv.indexOf('--port');
const PORT =
  portFlagIndex !== -1 && process.argv[portFlagIndex + 1]
    ? Number(process.argv[portFlagIndex + 1]) || 3000
    : 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const { app, ensureSeeded } = createApiApp();
  await ensureSeeded();

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

  attachErrorHandler(app);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`COMMON server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start COMMON server:', err);
  process.exit(1);
});
