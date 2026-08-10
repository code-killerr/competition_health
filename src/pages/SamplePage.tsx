import React, { useMemo, useState } from 'react';
import { Check, X, RefreshCw, FlaskRound } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useExperiment } from '@/contexts/ExperimentContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const sampleFields = [
  { label: '组织类型', value: '实体组织' },
  { label: '保存条件', value: '-80°C · 干冰运输' },
  { label: '切片厚度', value: '14 μm' },
  { label: '组织尺寸', value: '4.2 × 6.8 mm' },
  { label: 'RNA 预检', value: 'RIN 8.2 ≥ 7' },
  { label: '芯片标记区', value: 'Zone A · 2 tests' },
];

const intakeChecklist = [
  { label: '样本来源已记录', checked: true },
  { label: 'OCT 包埋状态确认', checked: true },
  { label: '运输温度链完整', checked: true },
  { label: '组织尺寸符合标记区', checked: true },
  { label: 'RNA 预检通过', checked: true },
  { label: '切片厚度锁定', checked: true },
];

const SamplePage: React.FC = () => {
  const { current, validateSample } = useExperiment();
  const [nuclei, setNuclei] = useState(current.sample.nuclei);
  const [rate, setRate] = useState(current.sample.rate);
  const [aggregation, setAggregation] = useState(current.sample.aggregation);

  const qcPass = useMemo(() => nuclei <= 200000 && rate > 5 && aggregation < 30, [nuclei, rate, aggregation]);
  const perReaction = Math.round(nuclei / 8);
  const nucleiPct = Math.min((nuclei / 200000) * 100, 100);

  const handleValidate = () => {
    validateSample({ nuclei, rate, aggregation, perReaction });
    if (qcPass) {
      toast.success('样本门槛通过，可以放行 Step 2');
    } else {
      toast.warning('样本被拦截：请先调整核悬液 QC');
    }
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6">
          <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Sample Intake / 03</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">样本建档与核悬液放行</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            把样本来源、切片条件和核悬液 QC 在进入 Step 2 前锁定。
          </p>
        </div>

        {/* 样本卡 + 核悬液质检 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel label="Sample Record" title="样本信息" tag={<StatusBadge tone="pass">已建档</StatusBadge>}>
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-mono-data text-lg font-bold text-primary">
                T1
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-foreground">Tissue_A</h3>
                <p className="text-xs text-muted-foreground">SP-20260810-01 · OCT 包埋新鲜冷冻组织</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {sampleFields.map((f) => (
                <div key={f.label} className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
                  <span className="block text-xs text-muted-foreground">{f.label}</span>
                  <strong className="block text-sm text-foreground">{f.value}</strong>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Nuclei Gate" title="核悬液质检" tag={<StatusBadge tone={qcPass ? 'pass' : 'fail'}>{qcPass ? 'PASS' : 'HOLD'}</StatusBadge>}>
            <div className="flex items-center gap-5">
              {/* 环形仪表盘 */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={qcPass ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(rate / 100) * 264} 264`}
                  />
                </svg>
                <div className="absolute text-center">
                  <strong className="font-mono-data text-2xl text-foreground">{rate}</strong>
                  <span className="block text-[10px] text-muted-foreground">有核率 %</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <strong className="font-mono-data text-xl text-foreground">{nuclei.toLocaleString()}</strong>
                  <small className="text-xs text-muted-foreground">标记区总细胞核 · 上限 200,000</small>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn('h-full rounded-full', qcPass ? 'bg-primary' : 'bg-destructive')} style={{ width: `${nucleiPct}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center">
                <small className="block text-[10px] text-muted-foreground">单管投入</small>
                <strong className="block font-mono-data text-sm text-foreground">{perReaction.toLocaleString()}</strong>
                <small className="text-[10px] text-muted-foreground">上限 25,000</small>
              </div>
              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center">
                <small className="block text-[10px] text-muted-foreground">结团率</small>
                <strong className={cn('block font-mono-data text-sm', aggregation < 30 ? 'text-primary' : 'text-destructive')}>{aggregation}%</strong>
                <small className="text-[10px] text-muted-foreground">门槛 &lt; 30%</small>
              </div>
              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center">
                <small className="block text-[10px] text-muted-foreground">冰上等待</small>
                <strong className="block font-mono-data text-sm text-foreground">18 min</strong>
                <small className="text-[10px] text-muted-foreground">建议 30 min 内</small>
              </div>
            </div>
          </Panel>
        </div>

        {/* 检查清单 + QC调整 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel label="Intake Checklist" title="入场检查" tag={<StatusBadge tone="pass">全部通过</StatusBadge>}>
            <div className="space-y-2">
              {intakeChecklist.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="QC Input" title="调整样本" tag={<StatusBadge tone="neutral">可配置</StatusBadge>}>
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">总细胞核</span>
                  <span className="font-mono-data text-sm text-foreground">{nuclei.toLocaleString()}</span>
                </div>
                <Slider value={[nuclei]} min={10000} max={240000} step={1000} onValueChange={([v]) => setNuclei(v)} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">有核率</span>
                  <span className="font-mono-data text-sm text-foreground">{rate}%</span>
                </div>
                <Slider value={[rate]} min={1} max={100} step={1} onValueChange={([v]) => setRate(v)} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">结团率</span>
                  <span className="font-mono-data text-sm text-foreground">{aggregation}%</span>
                </div>
                <Slider value={[aggregation]} min={0} max={60} step={1} onValueChange={([v]) => setAggregation(v)} />
              </div>
              <div className="flex items-center gap-2">
                {qcPass ? (
                  <span className="flex items-center gap-1.5 text-xs text-primary">
                    <Check className="h-3.5 w-3.5" /> QC 通过
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-destructive">
                    <X className="h-3.5 w-3.5" /> {nuclei > 200000 ? '总核数超限' : rate <= 5 ? '有核率过低' : '结团率超限'}
                  </span>
                )}
              </div>
              <Button onClick={handleValidate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <RefreshCw className="mr-1.5 h-4 w-4" />
                重新评估
              </Button>
              <p className="text-pretty text-[11px] leading-relaxed text-muted-foreground">
                滑动后点击"重新评估"，查看 QC 不通过时的拦截逻辑。
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default SamplePage;