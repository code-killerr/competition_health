import React from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowUpRight, ArrowRight, Check } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { useExperiment } from '@/contexts/ExperimentContext';
import { inputFiles, libraries, spatialMapValues, expressionGenes } from '@/data/mockData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const spotColors = ['bg-secondary', 'bg-primary/30', 'bg-primary/60', 'bg-accent/60'];

const validationGates = [
  { label: '组织边界', status: 'PASS' },
  { label: '空间标记区', status: 'PASS' },
  { label: '文库主峰', status: 'PASS' },
  { label: '输入完整性', status: 'PASS' },
];

const DataPage: React.FC = () => {
  const { current, loadData } = useExperiment();
  const { dataLoaded } = current;

  const handleLoad = () => {
    loadData();
    toast.success('数据已加载：四类文库 QC 均为 PASS');
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Data & QC / 05</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">从文库质控到空间结果</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              数据按说明书的数据契约组织；每个 QC 卡都能回到具体的测序或分析输入。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-xs text-muted-foreground">{dataLoaded ? '已计算 · 文档字段映射' : '文档字段映射'}</span>
            <Button size="sm" onClick={handleLoad} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {dataLoaded ? '重新加载数据' : '加载数据'}
            </Button>
          </div>
        </div>

        {/* 状态横幅 */}
        <div
          className={cn(
            'mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
            dataLoaded ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/40'
          )}
        >
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', dataLoaded ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground')}>
            <ArrowUpRight className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm text-foreground">{dataLoaded ? '数据已载入，QC 计算完成' : '数据尚未载入'}</strong>
            <small className="block text-pretty text-xs text-muted-foreground">
              {dataLoaded ? '6 个输入文件已映射到 SeekSpace Tools，四类文库均通过 QC 门槛，PDF 原图与视觉复核结果已回链。' : '加载后将展示 FASTQ / 图像输入、四类文库 QC 和空间定位预览。'}
            </small>
          </div>
          <StatusBadge tone={dataLoaded ? 'pass' : 'neutral'}>{dataLoaded ? 'READY' : 'WAITING'}</StatusBadge>
        </div>

        {/* 输入清单 + 测序策略 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel label="Input Manifest" title="分析输入" tag={<StatusBadge tone="neutral">SeekSpace Tools</StatusBadge>}>
            <div className="space-y-2">
              {inputFiles.map((file) => (
                <div key={file.name} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-foreground">{file.name}</strong>
                    <small className="block truncate font-mono-data text-[10px] text-muted-foreground">{file.file}</small>
                  </div>
                  <StatusBadge tone={dataLoaded ? 'pass' : 'neutral'}>{dataLoaded ? 'LINKED' : 'WAITING'}</StatusBadge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Sequencing Plan" title="测序策略" tag={<StatusBadge tone="pass">DOC-MAPPED</StatusBadge>}>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Expression</span>
                  <strong className="font-mono-data text-sm text-primary">≥ 120 G</strong>
                </div>
                <small className="font-mono-data text-[10px] text-muted-foreground">PE · R1 63 bp · R2 150 bp</small>
              </div>
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Spatial</span>
                  <strong className="font-mono-data text-sm text-accent">≥ 30 G</strong>
                </div>
                <small className="font-mono-data text-[10px] text-muted-foreground">PE · R1 63 bp · R2 32 bp</small>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                <span className="font-mono-data text-xs text-muted-foreground">N5</span>
                <strong className="font-mono-data text-sm text-foreground">8 bp</strong>
                <span className="font-mono-data text-xs text-muted-foreground">N7</span>
                <strong className="font-mono-data text-sm text-foreground">8 bp</strong>
                <small className="ml-auto text-[10px] text-muted-foreground">双端 Index · 避免重复</small>
              </div>
            </div>
          </Panel>
        </div>

        {/* 文库质量卡 */}
        <div className="mt-4">
          <Panel label="Library QC" title="四类文库质量门" tag={<span className="text-xs text-muted-foreground">阈值来自说明书 Step 7–9</span>}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {libraries.map((lib, index) => (
                <motion.div
                  key={lib.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-lg border border-border bg-secondary/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-data text-[10px] text-primary">{lib.marker}</span>
                    <StatusBadge tone={dataLoaded ? 'pass' : 'neutral'}>{dataLoaded ? lib.status : 'WAITING'}</StatusBadge>
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-foreground">{lib.name}</h4>
                  <strong className="block font-mono-data text-lg text-foreground">{lib.value}</strong>
                  <span className="block text-xs text-accent">{lib.peak}</span>
                  <small className="block text-pretty text-[10px] text-muted-foreground">{lib.rule}</small>
                  <div className="mt-3 flex h-12 items-end gap-1">
                    {lib.bars.map((h, i) => (
                      <span key={i} className="flex-1 rounded-t bg-primary/40" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </Panel>
        </div>

        {/* 空间预览 + 表达图 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel label="Spatial Preview" title="空间定位预览" tag={<StatusBadge tone="neutral">DAPI / HE overlay</StatusBadge>}>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="grid grid-cols-10 gap-1">
                {spatialMapValues.map((v, i) => (
                  <span
                    key={i}
                    className={cn('aspect-square rounded-sm', spotColors[v])}
                    style={{ animation: `spot-in 0.4s ease-out ${i * 12}ms both` }}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3">
                <span className="flex items-center gap-1.5 text-xs text-foreground"><i className="h-2.5 w-2.5 rounded-sm bg-primary/60" />Cluster A · 37%</span>
                <span className="flex items-center gap-1.5 text-xs text-foreground"><i className="h-2.5 w-2.5 rounded-sm bg-accent/60" />Cluster B · 24%</span>
                <span className="flex items-center gap-1.5 text-xs text-foreground"><i className="h-2.5 w-2.5 rounded-sm bg-primary/30" />Cluster C · 18%</span>
              </div>
            </div>
          </Panel>

          <Panel label="Expression Artifact" title="表达信号预览" tag={<StatusBadge tone="pass">COMPUTED</StatusBadge>}>
            <div className="space-y-3">
              {expressionGenes.map(([gene, value]) => (
                <div key={gene} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono-data text-xs text-foreground">{gene}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-primary"
                    />
                  </div>
                  <strong className="w-8 shrink-0 text-right font-mono-data text-xs text-foreground">{value}</strong>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span>表达矩阵：matrix / zarr</span>
              <span>细胞识别：barcode calling</span>
            </div>
          </Panel>
        </div>

        {/* 结果识别与校验流程 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel label="Result Evidence / PDF Source" title="结果识别输入" tag={<StatusBadge tone="neutral">原图页码绑定</StatusBadge>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="overflow-hidden rounded-lg border border-border bg-secondary/40">
                <div className="aspect-[4/3] w-full bg-secondary" />
                <div className="p-2">
                  <strong className="block text-xs text-foreground">DAPI / 组织图像</strong>
                  <small className="block text-pretty text-[10px] text-muted-foreground">识别：组织边界、标记区覆盖、成像完整性 · SeekSpace p.31</small>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-secondary/40">
                <div className="aspect-[4/3] w-full bg-secondary" />
                <div className="p-2">
                  <strong className="block text-xs text-foreground">文库峰图</strong>
                  <small className="block text-pretty text-[10px] text-muted-foreground">识别：主峰位置、峰型异常、长度范围 · SeekOne DD p.20</small>
                </div>
              </div>
            </div>
          </Panel>

          <Panel label="Identify → Validate → Release" title="结果识别与校验流程" tag={<StatusBadge tone="pass">4 / 4 PASS</StatusBadge>}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {[
                { code: '01', title: '读入原图', sub: 'DAPI / 峰图 / 输入文件' },
                { code: '02', title: '视觉识别', sub: '对象、边界、峰型、异常' },
                { code: '03', title: '规则校验', sub: 'SOP 阈值与数据契约' },
                { code: '04', title: '放行结论', sub: 'PASS / HOLD + 证据回链', release: true },
              ].map((s, i, arr) => (
                <React.Fragment key={s.code}>
                  <div className={cn('flex-1 rounded-lg border p-3', s.release ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/40')}>
                    <span className="font-mono-data text-[10px] text-primary">{s.code}</span>
                    <strong className="mt-1 block text-xs text-foreground">{s.title}</strong>
                    <small className="block text-pretty text-[10px] text-muted-foreground">{s.sub}</small>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {validationGates.map((g) => (
                <div key={g.label} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[11px] text-foreground">{g.label}</span>
                    <strong className="font-mono-data text-[10px] text-primary">{g.status}</strong>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-pretty text-[11px] leading-relaxed text-muted-foreground">
              视觉模型给出结构化识别结果，规则引擎负责最终放行；任一关键对象缺失、置信度不足或阈值不合格，结果自动转为 HOLD。
            </p>
          </Panel>
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default DataPage;