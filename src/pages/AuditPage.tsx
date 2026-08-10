import React from 'react';
import { motion } from 'motion/react';
import { Download, Check, FileBox, Clock } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { useExperiment } from '@/contexts/ExperimentContext';
import { artifacts, eventLog, stageEvidence, agentReferenceBasis, libraries } from '@/data/mockData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const scoreBreakdown = [
  { label: '设备绑定', value: 100 },
  { label: '样本门槛', value: 100 },
  { label: '数据来源', value: 92 },
];

const AuditPage: React.FC = () => {
  const { current } = useExperiment();
  const { dataLoaded, sopStage } = current;

  const handleExport = () => {
    const activeEvidence = stageEvidence[sopStage < 0 ? 0 : sopStage];
    const report = {
      run_id: 'SS-20260810-01',
      purpose: '科研用途',
      source_documents: ['SeekSpace 使用说明书-20260717', 'SeekOne DD 使用说明书-20250117', 'CG000632 FFPE Sample Prep'],
      devices_registered: 9,
      sop_stage: sopStage + 1,
      data_loaded: dataLoaded,
      library_qc: libraries.map(({ name, value, peak, status }) => ({ name, value, peak, status })),
      artifacts: artifacts.map(({ name, detail, type }) => ({ name, detail, type })),
      agent_reference_basis: agentReferenceBasis,
      generated_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seekspace-report.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('实验报告已生成（JSON）');
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Audit Trail / 06</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">证据链与实验报告</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              把设备注册、SOP 动作、QC 判断和数据产物合成一个可复核的实验包。
            </p>
          </div>
          <Button size="sm" onClick={handleExport} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            导出实验报告
          </Button>
        </div>

        {/* 评分 + 产物 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel label="Run Health" title="当前实验可追溯度">
            <div className="flex items-center gap-5">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(96 / 100) * 264} 264`} />
                </svg>
                <div className="absolute text-center">
                  <strong className="font-mono-data text-2xl text-primary">96</strong>
                  <span className="block text-[10px] text-muted-foreground">TRACE SCORE</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
                  设备、样本、SOP 和数据文件均已绑定，真实设备执行仍需人工审批。
                </p>
                <div className="mt-3 space-y-2">
                  {scoreBreakdown.map((s) => (
                    <div key={s.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground">{s.label}</span>
                        <strong className="font-mono-data text-primary">{s.value}%</strong>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${s.value}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel label="Artifact Manifest" title="输出产物" tag={<StatusBadge tone="neutral">可下载</StatusBadge>}>
            <div className="space-y-2">
              {artifacts.map((a) => (
                <div key={a.name} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileBox className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate font-mono-data text-xs text-foreground">{a.name}</strong>
                    <small className="block truncate text-[11px] text-muted-foreground">{a.detail}</small>
                  </div>
                  <StatusBadge tone={dataLoaded ? 'pass' : 'pending'}>{dataLoaded ? 'LINKED' : 'PENDING'}</StatusBadge>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* 事件日志 */}
        <div className="mt-4">
          <Panel label="Event Log" title="事件日志" tag={<span className="text-xs text-muted-foreground">append-only · local demo</span>}>
            <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-max text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">时间</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">事件</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">详情</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">来源</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">校验</th>
                  </tr>
                </thead>
                <tbody>
                  {eventLog.map((e, i) => (
                    <motion.tr
                      key={e.time}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className="border-b border-border/60 text-xs last:border-0 hover:bg-secondary/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono-data text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{e.time}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono-data text-[10px] text-primary">{e.event}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">{e.detail}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono-data text-[10px] text-muted-foreground">{e.actor}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Check className="h-3 w-3" />
                        </span>
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

export default AuditPage;