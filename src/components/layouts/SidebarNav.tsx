import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FlaskConical, GitCompareArrows, Ruler, Map, Cpu, FlaskRound, ListChecks,
  Database, ShieldCheck, ChevronDown, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExperiment } from '@/contexts/ExperimentContext';

const navItems = [
  { to: '/workspace/dashboard', label: '仪表盘', icon: LayoutDashboard, code: '00' },
  { to: '/workspace/experiments', label: '实验管理', icon: FlaskConical, code: '01' },
  { to: '/workspace/compare', label: '实验对比', icon: GitCompareArrows, code: '02' },
  { to: '/workspace/metrics', label: '指标管理', icon: Ruler, code: '03' },
  { to: '/workspace/overview', label: '实验总览', icon: Map, code: '04' },
  { to: '/workspace/devices', label: '设备管理', icon: Cpu, code: '05' },
  { to: '/workspace/sample', label: '样本建档', icon: FlaskRound, code: '06' },
  { to: '/workspace/sop', label: 'SOP 执行', icon: ListChecks, code: '07' },
  { to: '/workspace/data', label: '数据与质控', icon: Database, code: '08' },
  { to: '/workspace/audit', label: '审计追溯', icon: ShieldCheck, code: '09' },
];

const statusTone: Record<string, string> = {
  READY: 'text-muted-foreground',
  RUNNING: 'text-warning',
  COMPLETE: 'text-primary',
  ARCHIVED: 'text-muted-foreground',
};

const SidebarNav: React.FC = () => {
  const { experiments, currentId, current, switchExperiment } = useExperiment();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar">
      {/* 当前实验切换 */}
      <div className="border-b border-sidebar-border p-4">
        <span className="font-mono-data text-[10px] uppercase tracking-widest text-sidebar-muted">当前实验</span>
        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent px-3 py-2 text-left transition-colors hover:border-primary/40"
          >
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-sidebar-foreground">{current.name}</strong>
              <span className={cn('font-mono-data text-[10px]', statusTone[current.status])}>
                {current.id} · {current.status}
              </span>
            </div>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-sidebar-muted transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-sidebar-border bg-popover p-1 shadow-hover">
              {experiments.map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => { switchExperiment(exp.id); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-secondary',
                    exp.id === currentId && 'bg-primary/10'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-foreground">{exp.name}</strong>
                    <span className="font-mono-data text-[10px] text-muted-foreground">{exp.id} · {exp.status}</span>
                  </div>
                  {exp.id === currentId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary glow-border'
                      : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="font-mono-data text-[10px] opacity-60">{item.code}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 底部 */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between text-xs text-sidebar-muted">
          <span>证据链</span>
          <strong className="font-mono-data text-primary">{String(current.evidenceCount).padStart(2, '0')} / 10</strong>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${current.progress}%` }} />
        </div>
        <button
          type="button"
          onClick={() => navigate('/workspace/experiments')}
          className="mt-3 w-full rounded-lg border border-sidebar-border bg-sidebar-accent px-3 py-2 text-xs text-sidebar-foreground transition-colors hover:border-primary/40"
        >
          管理全部实验
        </button>
      </div>
    </aside>
  );
};

export default SidebarNav;