import DashboardPage from './pages/DashboardPage';
import ExperimentsPage from './pages/ExperimentsPage';
import ComparePage from './pages/ComparePage';
import OverviewPage from './pages/OverviewPage';
import DevicesPage from './pages/DevicesPage';
import SamplePage from './pages/SamplePage';
import SopPage from './pages/SopPage';
import DataPage from './pages/DataPage';
import AuditPage from './pages/AuditPage';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: '仪表盘', path: '/workspace/dashboard', element: <DashboardPage />, public: true },
  { name: '实验管理', path: '/workspace/experiments', element: <ExperimentsPage />, public: true },
  { name: '实验对比', path: '/workspace/compare', element: <ComparePage />, public: true },
  { name: '实验总览', path: '/workspace/overview', element: <OverviewPage />, public: true },
  { name: '设备管理', path: '/workspace/devices', element: <DevicesPage />, public: true },
  { name: '样本建档', path: '/workspace/sample', element: <SamplePage />, public: true },
  { name: 'SOP 执行', path: '/workspace/sop', element: <SopPage />, public: true },
  { name: '数据与质控', path: '/workspace/data', element: <DataPage />, public: true },
  { name: '审计追溯', path: '/workspace/audit', element: <AuditPage />, public: true },
];