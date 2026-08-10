import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FlaskConical, Cpu, Activity, CheckCircle2, Plus, ArrowRight, Clock } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { useExperiment } from '@/contexts/ExperimentContext';
import { cn } from '@/lib/utils';

const statusTone: Record<string, 'pass' | 'pending' | 'fail' | 'neutral' | 'info'> = {
  READY: 'neutral', RUNNING: 'pending', COMPLETE: 'pass', ARCHIVED: 'neutral',
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { experiments, devices, current, switchExperiment } = useExperiment();

  const running = experiments.filter((e) => e.status === 'RUNNING').length;
  const complete = experiments.filter((e) => e.status === 'COMPLETE').length;
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const totalEvidence = experiments.reduce((s, e) => s + e.evidenceCount, 0);

  const stats = [
    { label: '实验总数', value: experiments.length, icon: FlaskConical, tone: 'text-primary' },
    { label: '进行中', value: running, icon: Activity, tone: 'text-warning' },
    { label: '已完成', value: complete, icon: CheckCircle2, tone: 'text-primary' },
    { label: '设备总数', value: devices.length, icon: Cpu, tone: 'text-accent' },
    { label: '在线设备', value: onlineDevices, icon: Cpu, tone: 'text-primary' },
    { label: '证据链总数', value: totalEvidence, icon: CheckCircle2, tone: 'text-accent' },
  ];

  const recent = experiments.slice(0, 5);

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Dashboard / 00</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">实验控制台总览</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              当前选中：<strong className="text-foreground">{current.name}</strong> · {current.id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => navigate('/workspace/experiments')} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> 新建实验
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/workspace/devices')} className="hover:bg-secondary/80">
              <Cpu className="mr-1.5 h-3.5 w-3.5" /> 设备管理
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="panel-surface rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className={cn('h-4 w-4', s.tone)} />
              </div>
              <strong className="mt-2 block font-mono-data text-2xl text-foreground">{String(s.value).padStart(2, '0')}</strong>
            </motion.div>
          ))}
        </div>

        {/* 最近实验列表 */}
        <div className="mt-4">
          <Panel
            label="Recent Experiments"
            title="最近实验"
            tag={<Button size="sm" variant="ghost" onClick={() => navigate('/workspace/experiments')} className="text-primary hover:bg-primary/10">查看全部 <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>}
          >
            <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-max text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">实验 ID</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">实验名称</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">状态</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">进度</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">创建时间</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((exp, i) => (
                    <motion.tr
                      key={exp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-border/60 text-xs last:border-0 hover:bg-secondary/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono-data text-muted-foreground">{exp.id}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">{exp.name}</td>
                      <td className="whitespace-nowrap px-4 py-3"><StatusBadge tone={statusTone[exp.status]}>{exp.status}</StatusBadge></td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${exp.progress}%` }} />
                          </div>
                          <span className="font-mono-data text-[10px] text-muted-foreground">{exp.progress}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono-data text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{exp.createdAt}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => { switchExperiment(exp.id); navigate('/workspace/overview'); }} className="text-primary hover:bg-primary/10">
                          查看详情
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default DashboardPage;