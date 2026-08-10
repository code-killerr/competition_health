import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Search, Eye, ArrowLeftRight, Archive, Trash2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useExperiment } from '@/contexts/ExperimentContext';
import { toast } from 'sonner';
import type { ExperimentStatus } from '@/types/experiment';

const statusTone: Record<string, 'pass' | 'pending' | 'fail' | 'neutral' | 'info'> = {
  READY: 'neutral', RUNNING: 'pending', COMPLETE: 'pass', ARCHIVED: 'neutral',
};

const statusOptions: (ExperimentStatus | 'ALL')[] = ['ALL', 'READY', 'RUNNING', 'COMPLETE', 'ARCHIVED'];
const sampleTypes = ['新鲜冷冻肝脏组织', '小鼠大脑皮层', 'FFPE 结直肠癌组织', '小鼠胚胎心脏', '新鲜冷冻肾脏组织', '肺腺癌活检组织', '自定义'];

const PAGE_SIZE = 8;

const ExperimentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { experiments, currentId, switchExperiment, addExperiment, archiveExperiment, deleteExperiment } = useExperiment();

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [sampleType, setSampleType] = useState(sampleTypes[0]);
  const [target, setTarget] = useState('');

  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return experiments.filter((e) => {
      const matchKw = !keyword || e.name.toLowerCase().includes(keyword.toLowerCase()) || e.id.toLowerCase().includes(keyword.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      return matchKw && matchStatus;
    });
  }, [experiments, keyword, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreate = () => {
    if (!name.trim()) { toast.error('请填写实验名称'); return; }
    addExperiment({ name: name.trim(), sampleType, target: target.trim() || '空间转录组 · 2 区' });
    setName(''); setTarget('');
    setCreateOpen(false);
    toast.success('新实验已创建，状态为 READY');
  };

  const handleSwitch = (id: string) => {
    switchExperiment(id);
    toast.success('已切换为当前实验');
    navigate('/workspace/overview');
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6">
          <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Experiment Management / 01</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">实验管理</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">并行管理多个空间芯片实验，切换当前实验后工作区所有模块同步更新。</p>
        </div>

        <Panel
          label="Experiments"
          title={`实验列表 · ${filtered.length} 条`}
          tag={<Button size="sm" onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-1.5 h-3.5 w-3.5" />新建实验</Button>}
        >
          {/* 操作栏 */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="按实验 ID 或名称搜索" className="pl-8 bg-secondary/50" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-md border px-2.5 py-1.5 font-mono-data text-[10px] uppercase tracking-wide transition-colors ${
                    statusFilter === s ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'ALL' ? '全部' : s}
                </button>
              ))}
            </div>
          </div>

          {/* 表格 */}
          <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-max text-left">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">实验 ID</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">实验名称</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">状态</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">进度</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">证据链</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">创建时间</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((exp, i) => (
                  <motion.tr
                    key={exp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-b border-border/60 text-xs last:border-0 hover:bg-secondary/40 ${exp.id === currentId ? 'bg-primary/5' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono-data text-muted-foreground">{exp.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">{exp.name}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge tone={statusTone[exp.status]}>{exp.status}</StatusBadge></td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${exp.progress}%` }} />
                        </div>
                        <span className="font-mono-data text-[10px] text-muted-foreground">{exp.progress}%</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono-data text-foreground">{String(exp.evidenceCount).padStart(2, '0')} / 10</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono-data text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{exp.createdAt}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleSwitch(exp.id)} className="h-7 px-2 text-primary hover:bg-primary/10">
                          <Eye className="mr-1 h-3.5 w-3.5" />详情
                        </Button>
                        {exp.id !== currentId && (
                          <Button size="sm" variant="ghost" onClick={() => handleSwitch(exp.id)} className="h-7 px-2 text-foreground hover:bg-secondary">
                            <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />切换
                          </Button>
                        )}
                        {exp.status !== 'ARCHIVED' && (
                          <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(exp.id)} className="h-7 px-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(exp.id)} className="h-7 px-2 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">没有匹配的实验</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>共 {filtered.length} 条</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7 p-0 text-foreground hover:bg-secondary">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-mono-data text-foreground">{page} / {totalPages}</span>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7 p-0 text-foreground hover:bg-secondary">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Panel>

        {/* 新建实验弹窗 */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>新建实验</DialogTitle>
              <DialogDescription>填写实验信息，创建后状态为 READY，可进入工作区执行 SOP。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="exp-name" className="text-xs text-muted-foreground">实验名称 <span className="text-destructive">*</span></Label>
                <Input id="exp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：肝脏空间 ATAC 实验" className="bg-secondary/50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-type" className="text-xs text-muted-foreground">样本类型</Label>
                <select id="exp-type" value={sampleType} onChange={(e) => setSampleType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/50 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                  {sampleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-target" className="text-xs text-muted-foreground">目标产出</Label>
                <Input id="exp-target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="例如：空间转录组 · 2 区" className="bg-secondary/50" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setCreateOpen(false)} className="hover:bg-secondary/80">取消</Button>
              <Button onClick={handleCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">创建实验</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 归档确认 */}
        <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>归档实验？</AlertDialogTitle>
              <AlertDialogDescription>归档后实验状态将变为 ARCHIVED，仍可在列表中查看，但不再作为当前实验。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (archiveTarget) { archiveExperiment(archiveTarget); toast.success('实验已归档'); } setArchiveTarget(null); }} className="bg-primary text-primary-foreground hover:bg-primary/90">确认归档</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 删除确认 */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>删除实验？</AlertDialogTitle>
              <AlertDialogDescription>此操作不可撤销，实验及其所有记录将从列表中永久移除。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteTarget) { deleteExperiment(deleteTarget); toast.success('实验已删除'); } setDeleteTarget(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </WorkspaceLayout>
  );
};

export default ExperimentsPage;