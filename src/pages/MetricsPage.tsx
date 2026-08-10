import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Ruler, ArrowUp, ArrowDown } from 'lucide-react';
import WorkspaceLayout from '@/components/layouts/WorkspaceLayout';
import Panel from '@/components/common/Panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useExperiment } from '@/contexts/ExperimentContext';
import { toast } from 'sonner';
import type { Metric } from '@/types/experiment';

const PAGE_SIZE = 8;

const emptyForm = { name: '', unit: '', higherIsBetter: true, threshold: '', description: '' };

const MetricsPage: React.FC = () => {
  const { metrics, addMetric, updateMetric, deleteMetric } = useExperiment();

  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Metric | null>(null);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return metrics;
    return metrics.filter((m) => m.name.toLowerCase().includes(kw) || m.id.toLowerCase().includes(kw));
  }, [metrics, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (metric: Metric) => {
    setEditingId(metric.id);
    setForm({ name: metric.name, unit: metric.unit, higherIsBetter: metric.higherIsBetter, threshold: metric.threshold, description: metric.description });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('请填写指标名称');
      return;
    }
    if (editingId) {
      updateMetric(editingId, { ...form, name: form.name.trim() });
      toast.success('指标已更新');
    } else {
      const seq = String(Date.now()).slice(-4);
      addMetric({ id: `M-${seq}`, ...form, name: form.name.trim() });
      toast.success('指标已新建');
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMetric(deleteTarget.id);
      toast.success('指标已删除');
      setDeleteTarget(null);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6">
          <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Metric Management / 03</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">实验指标管理</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">管理实验对比所用的 QC 指标，新建、编辑或删除指标，指标的「优化方向」将决定对比时的最优/最差判定。</p>
        </div>

        <Panel label="Metric Library" title="指标库" tag={<span className="text-xs text-muted-foreground">共 {metrics.length} 项</span>}>
          {/* 操作栏 */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                placeholder="搜索指标名称或 ID"
                className="h-9 border-border bg-secondary/50 pl-9 text-sm"
              />
            </div>
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1.5 h-4 w-4" />新建指标
            </Button>
          </div>

          {/* 表格 */}
          <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-max text-left">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">指标名称</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">单位</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">优化方向</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">阈值</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">说明</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((metric, mi) => (
                  <motion.tr key={metric.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: mi * 0.03 }} className="border-b border-border/60 text-xs last:border-0 hover:bg-secondary/40">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Ruler className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="font-medium text-foreground">{metric.name}</span>
                        <span className="font-mono-data text-[10px] text-muted-foreground">{metric.id}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono-data text-muted-foreground">{metric.unit || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${metric.higherIsBetter ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
                        {metric.higherIsBetter ? <><ArrowUp className="h-3 w-3" />越大越优</> : <><ArrowDown className="h-3 w-3" />越小越优</>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono-data text-foreground">{metric.threshold || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{metric.description || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(metric)} className="h-7 px-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                          <Pencil className="mr-1 h-3 w-3" />编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(metric)} className="h-7 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="mr-1 h-3 w-3" />删除
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">没有匹配的指标</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>共 {filtered.length} 项</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 px-2">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="font-mono-data">{page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-7 px-2">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑指标' : '新建指标'}</DialogTitle>
            <DialogDescription>填写指标信息，优化方向将影响实验对比时的最优/最差判定。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="metric-name" className="text-xs">指标名称 <span className="text-destructive">*</span></Label>
              <Input id="metric-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="如：有核率" className="border-border bg-secondary/50 px-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="metric-unit" className="text-xs">单位</Label>
                <Input id="metric-unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="如：%" className="border-border bg-secondary/50 px-2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metric-threshold" className="text-xs">阈值</Label>
                <Input id="metric-threshold" value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="如：≥5%" className="border-border bg-secondary/50 px-2" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">优化方向</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm((f) => ({ ...f, higherIsBetter: true }))} className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${form.higherIsBetter ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'}`}>
                  <ArrowUp className="h-3.5 w-3.5" />越大越优
                </button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, higherIsBetter: false }))} className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${!form.higherIsBetter ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'}`}>
                  <ArrowDown className="h-3.5 w-3.5" />越小越优
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="metric-desc" className="text-xs">指标说明</Label>
              <Textarea id="metric-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="可选，描述指标含义" className="min-h-20 border-border bg-secondary/50 px-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="hover:bg-secondary">取消</Button>
            <Button onClick={handleSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90">{editingId ? '保存修改' : '创建指标'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除指标</AlertDialogTitle>
            <AlertDialogDescription>即将删除指标「{deleteTarget?.name}」，此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspaceLayout>
  );
};

export default MetricsPage;