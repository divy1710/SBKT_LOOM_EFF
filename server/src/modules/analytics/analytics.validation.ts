import { z } from 'zod';

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export enum AnalyticsShiftFilter {
  ALL = 'ALL',
  DAY = 'DAY',
  NIGHT = 'NIGHT',
}

export const baseAnalyticsQuerySchema = z
  .object({
    startDate: z
      .string({ required_error: 'startDate is required' })
      .regex(DATE_REGEX, 'startDate must be in YYYY-MM-DD format'),
    endDate: z
      .string({ required_error: 'endDate is required' })
      .regex(DATE_REGEX, 'endDate must be in YYYY-MM-DD format'),
    shift: z.nativeEnum(AnalyticsShiftFilter).default(AnalyticsShiftFilter.ALL),
    factoryId: z.string().regex(MONGO_ID_REGEX).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      return start <= end;
    },
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    },
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);
      return diffDays <= 366;
    },
    {
      message: 'Date range cannot exceed 366 days',
      path: ['endDate'],
    },
  );

export const machineAnalyticsQuerySchema = baseAnalyticsQuerySchema.and(
  z.object({
    machineId: z
      .string({ required_error: 'machineId is required' })
      .regex(MONGO_ID_REGEX, 'Invalid machineId format'),
  }),
);

export const machinePerformanceQuerySchema = baseAnalyticsQuerySchema.and(
  z.object({
    threshold: z.coerce.number().min(0, 'Threshold cannot be negative').default(150),
    thresholdType: z.enum(['AVERAGE', 'TOTAL']).default('AVERAGE'),
  }),
);

export const efficiencyRankingQuerySchema = baseAnalyticsQuerySchema.and(
  z.object({
    minEfficiencyThreshold: z.coerce.number().min(0).max(100).default(85),
    sortBy: z.enum(['avgEfficiency', 'machineNumber', 'validEntriesCount']).default('avgEfficiency'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
);

export const machineEfficiencyDetailsQuerySchema = machineAnalyticsQuerySchema.and(
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z
      .enum(['productionDate', 'actualProductionMeters', 'efficiencyPercent'])
      .default('productionDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
);

export type BaseAnalyticsQuery = z.infer<typeof baseAnalyticsQuerySchema>;
export type MachineAnalyticsQuery = z.infer<typeof machineAnalyticsQuerySchema>;
export type MachinePerformanceQuery = z.infer<typeof machinePerformanceQuerySchema>;
export type EfficiencyRankingQuery = z.infer<typeof efficiencyRankingQuerySchema>;
export type MachineEfficiencyDetailsQuery = z.infer<typeof machineEfficiencyDetailsQuerySchema>;
