import { createBrowserRouter, Navigate } from 'react-router-dom';
import WelcomePage from '@/pages/WelcomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
import AuthenticatedHomePage from '@/pages/AuthenticatedHomePage';
import YarnMasterPage from '@/features/yarn/pages/YarnMasterPage';
import FabricMasterPage from '@/features/fabric/pages/FabricMasterPage';
import { BeamMasterPage } from '@/features/beam/pages/BeamMasterPage';
import { MachineListPage } from '@/features/machine/pages/MachineListPage';
import { MachineDetailPage } from '@/features/machine/pages/MachineDetailPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';

import { ProductionSheetPage } from '@/features/production/pages/ProductionSheetPage';
import { ProductionAnalysisPage } from '@/features/analytics/pages/ProductionAnalysisPage';
import { MachineAnalyticsPage } from '@/features/analytics/pages/MachineAnalyticsPage';
import { FabricQualityAnalyticsPage } from '@/features/analytics/pages/FabricQualityAnalyticsPage';
import { MachinePerformancePage } from '@/features/analytics/pages/MachinePerformancePage';
import { EfficiencyAnalyticsPage } from '@/features/analytics/pages/EfficiencyAnalyticsPage';

export const router = createBrowserRouter([
  // ── Public ────────────────────────────────────────────────────────────────
  { path: '/', element: <WelcomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  // ── Protected ─────────────────────────────────────────────────────────────
  {
    path: '/home',
    element: (
      <ProtectedRoute>
        <AuthenticatedHomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/yarn',
    element: (
      <ProtectedRoute>
        <YarnMasterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/fabrics',
    element: (
      <ProtectedRoute>
        <FabricMasterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/beams',
    element: (
      <ProtectedRoute>
        <BeamMasterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/machines',
    element: (
      <ProtectedRoute>
        <MachineListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/machines/:id',
    element: (
      <ProtectedRoute>
        <MachineDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/production-sheets',
    element: (
      <ProtectedRoute>
        <ProductionSheetPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: <Navigate to="/analytics/production" replace />,
  },
  {
    path: '/analytics/production',
    element: (
      <ProtectedRoute>
        <ProductionAnalysisPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics/machines',
    element: (
      <ProtectedRoute>
        <MachineAnalyticsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics/fabric-quality',
    element: (
      <ProtectedRoute>
        <FabricQualityAnalyticsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics/performance',
    element: (
      <ProtectedRoute>
        <MachinePerformancePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics/efficiency',
    element: (
      <ProtectedRoute>
        <EfficiencyAnalyticsPage />
      </ProtectedRoute>
    ),
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '/404', element: <NotFoundPage /> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
