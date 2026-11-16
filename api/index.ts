import { attachErrorHandler, createApiApp } from '../src/server/app';

const { app } = createApiApp();
attachErrorHandler(app);

export default app;
