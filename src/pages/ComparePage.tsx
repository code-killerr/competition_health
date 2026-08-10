import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { X, ArrowLeft, Download, Layers } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { useExperiment } from '@/contexts/ExperimentContext';
import { traceScore, deriveLibraryQC } from '@/data/mockData';
import type { Experiment } from '@/types/experiment';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusTone: Record<string, 'pass' | 'pending' | 'fail' | 'neutral' | 'info'> = {
  READY: 'neutral', RUNNING: 'pending', COMPLETE: 'pass', ARCHIVED: 'neutral',
};

const expColors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(270 65% 68%)'];

interface MetricDef {
  key: string;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  getValue: (exp: Experiment) => number;
  format: (v: number) => string;
}

const metrics: MetricDef[] = [
  { key: 'rate', label: '有核率', unit: '%', higherIsBetter: true, getValue: (e) => e.sample.rate, format: (v) => `${v}%` },
  { key: 'nuclei', label: '总细胞核', unit: '', higherIsBetter: true, getValue: (e) => e.sample.nuclei, format: (v) => v.toLocaleString() },
  { key: 'aggregation', label: '结团率', unit: '%', higherIsBetter: false, getValue: (e) => e.sample.aggregation, format: (v) => `${v}%` },
  { key: 'perReaction', label: '单管投入', unit: '', higherIsBetter: true, getValue: (e) => e.sample.perReaction, format: (v) => v.toLocaleString() },
  { key: 'evidence', label: '证据链数', unit: '/10', higherIsBetter: true, getValue: (e) => e.evidenceCount, format: (v) => `${v}/10` },
  { key: 'trace', label: '追溯评分', unit: '', higherIsBetter: true, getValue: (e) => traceScore(e), format: (v) => `${v}` },
  { key: 'progress', label: '实验进度', unit: '%', higherIsBetter: true, getValue: (e) => e.progress, format: (v) => `${v}%` },
];

const libraryNames = ['cDNA 文库', '表达文库', '空间标签文库', 'ATAC 文库'];

// 雷达图维度（归一化到 0-100）
const radarDims = [
  { label: '有核率', get: (e: Experiment) => e.sample.rate },
  { label: '总细胞核', get: (e: Experiment) => (e.sample.nuclei / 200000) * 100 },
  { label: '结团率', get: (e: Experiment) => 100 - e.sample.aggregation },
  { label: '单管投入', get: (e: Experiment) => (e.sample.perReaction / 25000) * 100 },
  { label: '证据链', get: (e: Experiment) => (e.evidenceCount / 10) * 100 },
  { label: '追溯评分', get: (e: Experiment) => traceScore(e) },
];

const RadarChart: React.FC<{ experiments: Experiment[] }> = ({ experiments }) => {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 44;
  const n = radarDims.length;

  const pointAt = (i: number, value: number) => {
    const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
    const r = R * (Math.min(100, Math.max(0, value)) / 100);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-xs">
        {/* 网格环 */}
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <polygon
            key={ring}
            points={radarDims.map((_, i) => { const p = pointAt(i, ring * 100); return `${p.x},${p.y}`; }).join(' ')}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />
        ))}
        {/* 轴线 */}
        {radarDims.map((_, i) => {
          const p = pointAt(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="hsl(var(--border))" strokeWidth="1" />;
        })}
        {/* 实验多边形 */}
        {experiments.map((exp, ei) => {
          const pts = radarDims.map((d, i) => { const p = pointAt(i, d.get(exp)); return `${p.x},${p.y}`; }).join(' ');
          return (
            <g key={exp.id}>
              <polygon points={pts} fill={expColors[ei]} fillOpacity="0.18" stroke={expColors[ei]} strokeWidth="2" />
              {radarDims.map((d, i) => { const p = pointAt(i, d.get(exp)); return <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={expColors[ei]} />; })}
            </g>
          );
        })}
        {/* 维度标签 */}
        {radarDims.map((d, i) => {
          const p = pointAt(i, 122);
          return (
            <text key={d.label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontFamily="monospace">
              {d.label}
            </text>
          );
        })}
      </svg>
      {/* 图例 */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {experiments.map((exp, ei) => (
          <span key={exp.id} className="flex items-center gap-1.5 text-xs text-foreground">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: expColors[ei] }} />
            <span className="max-w-24 truncate">{exp.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { experiments } = useExperiment();

  const ids = useMemo(() => (searchParams.get('ids') || '').split(',').filter(Boolean), [searchParams]);
  const selected = useMemo(() => ids.map((id) => experiments.find((e) => e.id === id)).filter(Boolean) as Experiment[], [ids, experiments]);

  const removeId = (id: string) => {
    const next = ids.filter((x) => x !== id);
    if (next.length === 0) {
      navigate('/workspace/experiments');
    } else {
      setSearchParams({ ids: next.join(',') });
    }
  };

  const handleExport = () => {
    const report = {
      type: 'multi-experiment-comparison',
      generated_at: new Date().toISOString(),
      experiments: selected.map((exp) => ({
        id: exp.id, name: exp.name, status: exp.status, progress: exp.progress,
        sample_qc: exp.sample, evidence_count: exp.evidenceCount, trace_score: traceScore(exp),
        library_qc: deriveLibraryQC(exp),
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seekspace-comparison.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('对比报告已导出（JSON）');
  };

  // 计算每个指标的最优/最差
  const getCellTone = (metric: MetricDef, value: number) => {
    if (selected.length < 2) return 'none';
    const values = selected.map(metric.getValue);
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) return 'none';
    if (metric.higherIsBetter) {
      if (value === max) return 'best';
      if (value === min) return 'worst';
    } else {
      if (value === min) return 'best';
      if (value === max) return 'worst';
    }
    return 'none';
  };

  const cellClass: Record<string, string> = {
    best: 'bg-primary/15 text-primary font-semibold',
    worst: 'bg-destructive/15 text-destructive font-semibold',
    none: 'text-foreground',
  };

  if (selected.length < 2) {
    return (
      <WorkspaceLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Layers className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-foreground">选择实验进行对比</h2>
          <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
            请在实验管理中勾选 2~4 个实验，并点击「对比实验」按钮进入此页面并排查看 QC 指标。
          </p>
          <Button className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate('/workspace/experiments')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            前往实验管理
          </Button>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Experiment Comparison / 02</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">多实验 QC 对比</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">并排对比 {selected.length} 个实验的关键 QC 指标，最优值高亮、最差值标红。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate('/workspace/experiments')} className="hover:bg-secondary/80">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />重新选择
            </Button>
            <Button size="sm" onClick={handleExport} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="mr-1.5 h-3.5 w-3.5" />导出对比报告
            </Button>
          </div>
        </div>

        {/* 已选实验条 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {selected.map((exp, ei) => (
            <span key={exp.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5">
              <i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: expColors[ei] }} />
              <div className="min-w-0">
                <strong className="block max-w-32 truncate text-xs text-foreground">{exp.name}</strong>
                <span className="font-mono-data text-[10px] text-muted-foreground">{exp.id}</span>
              </div>
              <StatusBadge tone={statusTone[exp.status]}>{exp.status}</StatusBadge>
              <button type="button" onClick={() => removeId(exp.id)} className="ml-1 text-muted-foreground transition-colors hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>

        {/* 对比表格 */}
        <Panel label="QC Comparison Table" title="指标对比表" tag={<span className="text-xs text-muted-foreground">最优 <span className="text-primary">●</span> · 最差 <span className="text-destructive">●</span></span>}>
          <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-max text-left">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">指标</th>
                  {selected.map((exp, ei) => (
                    <th key={exp.id} className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                      <button type="button" onClick={() => navigate('/workspace/overview')} className="flex items-center justify-end gap-1.5 transition-colors hover:text-primary">
                        <i className="h-2 w-2 rounded-sm" style={{ backgroundColor: expColors[ei] }} />
                        <span className="max-w-28 truncate text-foreground">{exp.name}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, mi) => (
                  <motion.tr key={metric.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: mi * 0.04 }} className="border-b border-border/60 text-xs last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {metric.label}
                      {metric.unit && <span className="ml-1 font-mono-data text-[9px]">({metric.unit})</span>}
                    </td>
                    {selected.map((exp) => {
                      const v = metric.getValue(exp);
                      const tone = getCellTone(metric, v);
                      return (
                        <td key={exp.id} className={cn('whitespace-nowrap px-4 py-3 text-right font-mono-data transition-colors', cellClass[tone])}>
                          {metric.format(v)}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
                {/* 文库浓度分组 */}
                {libraryNames.map((libName, li) => (
                  <motion.tr key={libName} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (metrics.length + li) * 0.04 }} className="border-b border-border/60 text-xs last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{libName}浓度</td>
                    {selected.map((exp) => {
                      const lib = deriveLibraryQC(exp)[li];
                      const values = selected.map((e) => deriveLibraryQC(e)[li].value);
                      const max = Math.max(...values);
                      const min = Math.min(...values);
                      const tone = max === min ? 'none' : lib.value === max ? 'best' : lib.value === min ? 'worst' : 'none';
                      return (
                        <td key={exp.id} className={cn('whitespace-nowrap px-4 py-3 text-right font-mono-data', cellClass[tone])}>
                          {lib.value} <span className="text-[9px] opacity-60">nM</span>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* 雷达图 + 分组柱状图 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel label="Radar Chart" title="多维 QC 雷达图" tag={<StatusBadge tone="neutral">归一化 0-100</StatusBadge>}>
            <RadarChart experiments={selected} />
            <p className="mt-2 text-pretty text-[11px] leading-relaxed text-muted-foreground">
              结团率已做反向处理（越低越优），总细胞核、单管投入、证据链按门槛上限归一化。
            </p>
          </Panel>

          <Panel label="Grouped Bars" title="关键指标分组柱状图" tag={<StatusBadge tone="neutral">同指标内归一化</StatusBadge>}>
            <div className="space-y-5">
              {metrics.filter((m) => ['rate', 'aggregation', 'trace', 'progress'].includes(m.key)).map((metric) => {
                const values = selected.map((e) => metric.getValue(e));
                const max = Math.max(...values, 1);
                return (
                  <div key={metric.key}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-foreground">{metric.label}</span>
                      <span className="font-mono-data text-[10px] text-muted-foreground">{metric.higherIsBetter ? '越大越优' : '越小越优'}</span>
                    </div>
                    <div className="space-y-1.5">
                      {selected.map((exp, ei) => {
                        const v = metric.getValue(exp);
                        return (
                          <div key={exp.id} className="flex items-center gap-2">
                            <span className="w-20 shrink-0 truncate text-[11px] text-muted-foreground">{exp.name}</span>
                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(v / max) * 100}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: expColors[ei] }}
                              />
                            </div>
                            <span className="w-12 shrink-0 text-right font-mono-data text-[10px] text-foreground">{metric.format(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default ComparePage;