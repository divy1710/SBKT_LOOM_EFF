import { Router } from 'express';
import healthRouter from './v1/health.route';
import authRouter from '../modules/auth/auth.routes';
import userRouter from '../modules/user/user.routes';
import yarnRouter from '../modules/yarn/yarn.routes';
import fabricRouter from '../modules/fabric/fabric.routes';
import beamRouter from '../modules/beam/beam.routes';
import machineRouter from '../modules/machine/machine.routes';
import productionRouter from '../modules/production/production.routes';
import analyticsRouter from '../modules/analytics/analytics.routes';
import settingsRouter from '../modules/settings/settings.routes';
import backupRouter from '../modules/backup/backup.routes';

const apiV1Router = Router();

// ─── v1 Routes ────────────────────────────────────────────────────────────────
apiV1Router.use('/health', healthRouter);
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/users', userRouter);
apiV1Router.use('/yarn', yarnRouter);
apiV1Router.use('/fabrics', fabricRouter);
apiV1Router.use('/beams', beamRouter);
apiV1Router.use('/machines', machineRouter);
apiV1Router.use('/production-sheets', productionRouter);
apiV1Router.use('/analytics', analyticsRouter);
apiV1Router.use('/settings', settingsRouter);
apiV1Router.use('/backup', backupRouter);
apiV1Router.use('/settings/backup', backupRouter);

export default apiV1Router;
