import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import {
  getProductionSummary,
  getProductionTrend,
  getMachineAnalytics,
  getFabricQualityAnalytics,
  getMachinePerformance,
  getEfficiencySummary,
  getMachineEfficiencyTrend,
  getMachineEfficiencyDetails,
  getEfficiencyRanking,
  getCrossFactoryAnalytics,
} from './analytics.controller';
import { requirePermission } from '../auth/permissions';
import {
  baseAnalyticsQuerySchema,
  machineAnalyticsQuerySchema,
  machinePerformanceQuerySchema,
  efficiencyRankingQuerySchema,
  machineEfficiencyDetailsQuerySchema,
} from './analytics.validation';

const router = Router();

// ── All analytics routes require authentication ───────────────────────────────
router.use(authenticate);

// ── 1. Production Summary & Smart Insights ────────────────────────────────────
router.get(
  '/production-summary',
  validate(baseAnalyticsQuerySchema, 'query'),
  getProductionSummary,
);

// ── 2. Production Trend Graph ─────────────────────────────────────────────────
router.get(
  '/production-trend',
  validate(baseAnalyticsQuerySchema, 'query'),
  getProductionTrend,
);

// ── 3. Single Machine Production Analytics ────────────────────────────────────
router.get(
  '/machine',
  validate(machineAnalyticsQuerySchema, 'query'),
  getMachineAnalytics,
);

// ── 4. Fabric Quality Distribution ────────────────────────────────────────────
router.get(
  '/fabric-quality',
  validate(baseAnalyticsQuerySchema, 'query'),
  getFabricQualityAnalytics,
);

// ── 5. Machine Performance (Top 5, Bottom 5, Below Threshold) ─────────────────
router.get(
  '/machine-performance',
  validate(machinePerformanceQuerySchema, 'query'),
  getMachinePerformance,
);

// ── 6. Efficiency Summary & Distribution ──────────────────────────────────────
router.get(
  '/efficiency-summary',
  validate(baseAnalyticsQuerySchema, 'query'),
  getEfficiencySummary,
);

// ── 7. Single Machine Efficiency Trend ────────────────────────────────────────
router.get(
  '/machine-efficiency-trend',
  validate(machineAnalyticsQuerySchema, 'query'),
  getMachineEfficiencyTrend,
);

// ── 8. Single Machine Detailed Efficiency Records ─────────────────────────────
router.get(
  '/machine-efficiency-details',
  validate(machineEfficiencyDetailsQuerySchema, 'query'),
  getMachineEfficiencyDetails,
);

// ── 9. Machine Efficiency Ranking & Low Threshold ─────────────────────────────
router.get(
  '/efficiency-ranking',
  validate(efficiencyRankingQuerySchema, 'query'),
  getEfficiencyRanking,
);

// ── 10. Cross-Factory Analytics (Super Admin only) ────────────────────────────
router.get(
  '/cross-factory',
  requirePermission('analytics.cross_factory'),
  getCrossFactoryAnalytics,
);

export default router;
