import React from 'react';
import { motion } from 'motion/react';
import { Check, Circle, Loader2, ArrowRight } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import StatusBadge from '@/components/common/StatusBadge';
import { useExperiment } from '@/contexts/ExperimentContext';
import { sopSteps, gates } from '@/data/mockData';
import { cn } from '@/lib/utils';

const OverviewPage: React.FC = () => {
  const { current, traceItems } = useExperiment();
  const { sopStage, sopCompleted } = current;

  const getStepStatus = (index: number): 'done' | 'active' | 'pending' => {
    if (sopCompleted) return 'done';
    if (sopStage < 0) return 'pending';
    if (index < sopStage) return 'done';
    if (index === sopStage) return 'active';
    return 'pending';
  };

  const traceList = traceItems;

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* 头部 */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Run Overview / 01</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">一次实验的控制面</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              先确认设备与样本，再放行 SOP，最后把文库和空间图像交给数据引擎。
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
            <span className="live-dot" />
            <div>
              <span className="text-xs text-foreground">等待启动</span>
              <small className="ml-2 font-mono-data text-[10px] text-muted-foreground">2026-08-10 · 14:32</small>
            </div>
          </div>
        </div>

        {/* 上半区：控制地图 + Agent追踪 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel label="Control Map" title="实验路径" tag={<StatusBadge tone="neutral">SeekSpace SOP</StatusBadge>}>
            <div className="flex flex-col gap-2">
              {sopSteps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <div key={step.code} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                          status === 'done' && 'border-primary bg-primary/15 text-primary',
                          status === 'active' && 'border-warning bg-warning/15 text-warning',
                          status === 'pending' && 'border-border bg-secondary text-muted-foreground'
                        )}
                      >
                        {status === 'done' ? <Check className="h-4 w-4" /> : step.code}
                      </span>
                      {index < sopSteps.length - 1 && (
                        <span className={cn('h-6 w-px', status === 'done' ? 'bg-primary/40' : 'bg-border')} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className={cn('block text-sm', status === 'pending' ? 'text-muted-foreground' : 'text-foreground')}>
                        {step.name}
                      </strong>
                      <small className="font-mono-data text-[10px] text-muted-foreground">{step.duration}</small>
                    </div>
                    <StatusBadge tone={status === 'done' ? 'pass' : status === 'active' ? 'pending' : 'neutral'}>
                      {status === 'done' ? 'DONE' : status === 'active' ? 'RUNNING' : 'PENDING'}
                    </StatusBadge>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary" />已完成</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-warning" />当前步骤</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-muted-foreground/40" />待执行</span>
            </div>
          </Panel>

          <Panel label="Agent Trace" title="可审计智能编排" tag={<StatusBadge tone="info">Agentic</StatusBadge>}>
            <div className="space-y-2">
              {traceList.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      item.status === 'done' && 'bg-primary/15 text-primary',
                      item.status === 'active' && 'bg-warning/15 text-warning',
                      item.status === 'pending' && 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {item.status === 'done' ? <Check className="h-3.5 w-3.5" /> : item.status === 'active' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block font-mono-data text-xs text-foreground">{item.title}</strong>
                    <small className="block truncate text-xs text-muted-foreground">{item.detail}</small>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
              <span className="text-primary">↳</span>
              <div>
                <strong className="text-xs text-foreground">Grounded by document</strong>
                <p className="text-pretty text-[11px] leading-relaxed text-muted-foreground">
                  每个判断都回指说明书门槛或实验数据文件，不直接信任模型自由生成。
                </p>
              </div>
            </div>
          </Panel>
        </div>

        {/* 下半区：放行门 + 数据契约 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel label="Release Gates" title="放行条件" tag={<StatusBadge tone="pass">4 / 4 PASS</StatusBadge>}>
            <div className="space-y-2.5">
              {gates.map((gate) => (
                <div key={gate.name} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm text-foreground">{gate.name}</strong>
                    <small className="block text-xs text-muted-foreground">{gate.detail}</small>
                  </div>
                  <span className="shrink-0 font-mono-data text-xs text-primary">{gate.value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Data Contract" title="数据契约" tag={<StatusBadge tone="neutral">附录 2–3</StatusBadge>}>
            <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              <div className="flex-1 rounded-lg border border-border bg-secondary/40 p-3">
                <span className="font-mono-data text-[10px] text-primary">01</span>
                <strong className="mt-1 block text-sm text-foreground">FASTQ + 图像</strong>
                <small className="block text-xs text-muted-foreground">Expression · Spatial · HDMI · TIFF</small>
              </div>
              <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 text-muted-foreground md:rotate-0" />
              <div className="flex-1 rounded-lg border border-border bg-secondary/40 p-3">
                <span className="font-mono-data text-[10px] text-accent">02</span>
                <strong className="mt-1 block text-sm text-foreground">SeekSpace Tools</strong>
                <small className="block text-xs text-muted-foreground">Barcode / 分割 / 定位 / 聚类</small>
              </div>
              <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 text-muted-foreground md:rotate-0" />
              <div className="flex-1 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <span className="font-mono-data text-[10px] text-primary">03</span>
                <strong className="mt-1 block text-sm text-foreground">可复用结果</strong>
                <small className="block text-xs text-muted-foreground">matrix · zarr · html · image</small>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default OverviewPage;