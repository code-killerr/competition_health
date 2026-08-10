import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, Check, Circle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { useExperiment } from '@/contexts/ExperimentContext';
import { sopSteps, stageEvidence, agentReferenceBasis } from '@/data/mockData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SopPage: React.FC = () => {
  const { current, runSopSequence, rerunVision } = useExperiment();
  const { sopStage, sopCompleted, visionStatus, visionConfidence } = current;
  const [selectedStep, setSelectedStep] = useState(0);
  const [rerunning, setRerunning] = useState(false);

  const activeIndex = sopStage < 0 ? selectedStep : sopStage;
  const step = sopSteps[activeIndex] ?? sopSteps[0];
  const evidence = stageEvidence[activeIndex] ?? stageEvidence[0];

  const getStepStatus = (index: number): 'done' | 'active' | 'pending' => {
    if (sopCompleted) return 'done';
    if (sopStage < 0) return 'pending';
    if (index < sopStage) return 'done';
    if (index === sopStage) return 'active';
    return 'pending';
  };

  useEffect(() => {
    if (sopStage >= 0) setSelectedStep(sopStage);
  }, [sopStage]);

  const handleRerunVision = useCallback(() => {
    if (!evidence.resultReview) {
      toast('当前步骤无视觉结果校验，已按 SOP 跳过');
      return;
    }
    setRerunning(true);
    rerunVision(activeIndex, evidence.title);
    window.setTimeout(() => {
      setRerunning(false);
      toast.success('视觉模型完成影像复核：关键对象与 SOP 规则均通过');
    }, 920);
  }, [evidence, activeIndex, rerunVision]);

  const handleRunSop = () => {
    runSopSequence();
    toast.success('SOP dry-run 已启动');
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Protocol Runner / 04</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">SeekSpace SOP 执行编排</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              按说明书拆成可暂停、可检查、可追踪的阶段；高风险动作默认只做 dry-run。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
              <span className="live-dot" /> Dry-run only
            </span>
            <Button size="sm" onClick={handleRunSop} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Play className="mr-1.5 h-3.5 w-3.5" />
              运行 SOP
            </Button>
          </div>
        </div>

        {/* 时间线 + 详情 */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel
              label="Protocol Steps"
              title="7 步实验主线"
              tag={<span className="font-mono-data text-xs text-muted-foreground">{sopCompleted ? '7 / 7' : `${Math.max(sopStage + 1, 0)} / 7`}</span>}
            >
              <div className="flex flex-col">
                {sopSteps.map((s, index) => {
                  const status = getStepStatus(index);
                  return (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setSelectedStep(index)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                        activeIndex === index ? 'bg-primary/10 glow-border' : 'hover:bg-secondary/60'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                          status === 'done' && 'border-primary bg-primary/15 text-primary',
                          status === 'active' && 'border-warning bg-warning/15 text-warning',
                          status === 'pending' && 'border-border bg-secondary text-muted-foreground'
                        )}
                      >
                        {status === 'done' ? <Check className="h-4 w-4" /> : status === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> : s.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className={cn('block text-sm', status === 'pending' ? 'text-muted-foreground' : 'text-foreground')}>{s.name}</strong>
                        <small className="font-mono-data text-[10px] text-muted-foreground">{s.duration}</small>
                      </div>
                      <StatusBadge tone={status === 'done' ? 'pass' : status === 'active' ? 'pending' : 'neutral'}>
                        {status === 'done' ? 'DONE' : status === 'active' ? 'RUNNING' : 'PENDING'}
                      </StatusBadge>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </div>

          <div>
            <Panel label="Current Step" title={step.name} tag={<StatusBadge tone={getStepStatus(activeIndex) === 'done' ? 'pass' : getStepStatus(activeIndex) === 'active' ? 'pending' : 'neutral'}>{getStepStatus(activeIndex).toUpperCase()}</StatusBadge>}>
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono-data text-xs text-primary">Step {step.code}</span>
                  <strong className="font-mono-data text-sm text-foreground">{step.duration}</strong>
                </div>
                <small className="mt-1 block text-[11px] text-muted-foreground">文档规定的阶段时长 / 上机时长</small>
              </div>
              <div className="mt-4">
                <span className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">放行规则</span>
                <p className="mt-1 text-pretty text-xs leading-relaxed text-foreground">{step.gate}</p>
              </div>
              <div className="mt-4">
                <span className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">证据动作</span>
                <ul className="mt-1.5 space-y-1.5">
                  {step.evidence.map((e) => (
                    <li key={e} className="flex items-start gap-2 text-xs text-foreground">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                <small className="font-mono-data text-[10px] text-muted-foreground">Reference: {step.reference}</small>
              </div>
            </Panel>
          </div>
        </div>

        {/* 影像证据 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* 过程影像 */}
          <Panel
            label="Visual Evidence / Stage-Configured"
            title={`${evidence.code} · ${evidence.title}`}
            tag={<StatusBadge tone="neutral">STEP {evidence.code} / 07</StatusBadge>}
          >
            <div className="overflow-hidden rounded-lg border border-border bg-secondary/40">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="font-mono-data text-[10px] text-muted-foreground">PROCESS IMAGE · SOP ONLY</span>
                <small className="font-mono-data text-[10px] text-muted-foreground">{evidence.processSource}</small>
              </div>
              <div className="relative aspect-[4/3] w-full">
                <img src={evidence.processImage} alt={`${evidence.title}过程影像`} className="h-full w-full object-cover" />
                {evidence.processMarkers.map((m, i) => (
                  <span
                    key={i}
                    className="absolute rounded border border-primary/60 bg-primary/10"
                    style={{ left: m.left, top: m.top, width: m.width, height: m.height }}
                  >
                    <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 font-mono-data text-[9px] text-primary-foreground">
                      {m.label} · {Math.round(m.confidence * 100)}%
                    </span>
                  </span>
                ))}
              </div>
              <div className="px-3 py-2">
                <strong className="text-xs text-foreground">{evidence.processLabel}</strong>
                <small className="block text-pretty text-[11px] text-muted-foreground">{evidence.processCaption}</small>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <span className="font-mono-data text-[10px] text-primary">STEP {evidence.code}</span>
              <div className="min-w-0 flex-1">
                <strong className="block text-xs text-foreground">过程影像已绑定步骤</strong>
                <small className="block text-[11px] text-muted-foreground">{evidence.processSource} · 仅作为 SOP 操作参照，不参与结果放行。</small>
              </div>
              <StatusBadge tone="neutral">LINKED</StatusBadge>
            </div>
          </Panel>

          {/* 视觉门 */}
          {evidence.resultReview ? (
            <Panel label="Multimodal Vision Gate" title="视觉大模型结果校验" tag={<StatusBadge tone={visionStatus === 'PASS' ? 'pass' : visionStatus === 'ANALYZING' ? 'pending' : 'fail'}>{visionStatus}</StatusBadge>}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="overflow-hidden rounded-lg border border-border bg-secondary/40">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="font-mono-data text-[10px] text-muted-foreground">RESULT IMAGE · AGENT INPUT</span>
                    <small className="font-mono-data text-[10px] text-muted-foreground">{evidence.resultSource}</small>
                  </div>
                  <div className="relative aspect-[4/3] w-full">
                    <img src={evidence.resultImage} alt={`${evidence.title}结果影像`} className="h-full w-full object-cover" />
                    {evidence.resultMarkers.map((m, i) => (
                      <span
                        key={i}
                        className="absolute rounded border border-accent/60 bg-accent/10"
                        style={{ left: m.left, top: m.top, width: m.width, height: m.height }}
                      >
                        <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 font-mono-data text-[9px] text-accent-foreground">
                          {m.label} · {Math.round(m.confidence * 100)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-xs text-foreground">{evidence.configTitle}</strong>
                      <small className="block text-[10px] text-muted-foreground">{evidence.configRule}</small>
                    </div>
                    <span className="font-mono-data text-sm font-bold text-accent">{Math.round(visionConfidence * 100)}%</span>
                  </div>

                  <div className="space-y-1.5">
                    {evidence.checks.map((check) => (
                      <div key={check.object} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Check className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block font-mono-data text-[11px] text-foreground">{check.object}</strong>
                          <small className="block text-[10px] text-muted-foreground">{check.detail}</small>
                        </div>
                        <span className="font-mono-data text-[10px] text-muted-foreground">{Math.round(check.confidence * 100)}%</span>
                        <StatusBadge tone="pass">PASS</StatusBadge>
                      </div>
                    ))}
                  </div>

                  <Button size="sm" onClick={handleRerunVision} disabled={rerunning} variant="secondary" className="hover:bg-secondary/80">
                    <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', rerunning && 'animate-spin')} />
                    {rerunning ? '分析中…' : '重新分析结果'}
                  </Button>
                </div>
              </div>

              {/* Agent 确认依据 */}
              <div className="mt-3">
                <span className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">Agent Confirmation Basis</span>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                  {agentReferenceBasis.map((basis, i) => (
                    <div
                      key={basis.label}
                      className={cn(
                        'flex items-start gap-2 rounded-lg border px-3 py-2',
                        i === activeIndex ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/30'
                      )}
                    >
                      <span className={cn('font-mono-data text-[10px]', i === activeIndex ? 'text-primary' : 'text-muted-foreground')}>
                        {i === activeIndex ? '✓' : String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-[11px] text-foreground">{basis.label}</strong>
                        <small className="block text-pretty text-[10px] leading-relaxed text-muted-foreground">{basis.value}</small>
                      </div>
                      <span className="shrink-0 font-mono-data text-[9px] text-muted-foreground">{basis.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          ) : (
            <Panel label="Multimodal Vision Gate" title="视觉大模型结果校验">
              <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <Circle className="h-6 w-6" />
                </span>
                <strong className="text-sm text-foreground">本步骤无视觉结果校验</strong>
                <p className="max-w-xs text-pretty text-xs text-muted-foreground">
                  已按 SOP 规则跳过视觉门，直接进入下一阶段。
                </p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default SopPage;