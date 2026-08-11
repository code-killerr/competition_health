import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
  '/workspace/dashboard': '仪表盘',
  '/workspace/experiments': '实验管理',
  '/workspace/compare': '实验对比',
  '/workspace/metrics': '指标管理',
  '/workspace/overview': '实验总览',
  '/workspace/devices': '设备管理',
  '/workspace/sample': '样本建档',
  '/workspace/sop': 'SOP 执行',
  '/workspace/data': '数据与质控',
  '/workspace/audit': '审计追溯',
  '/workspace/profile': '个人中心',
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const label = routeLabels[location.pathname];
  if (!label) return null;

  const isHome = location.pathname === '/workspace/dashboard';

  return (
    <nav className="flex items-center gap-1.5 border-b border-border bg-background/60 px-4 py-2.5 text-xs md:px-6">
      <Link
        to="/workspace/dashboard"
        className={cn(
          'flex items-center gap-1 transition-colors',
          isHome ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">工作台</span>
      </Link>
      {!isHome && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          <span className="truncate font-medium text-foreground">{label}</span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumb;