import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Pencil, Trash2, Cpu, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
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
import type { Device, DeviceStatus } from '@/types/experiment';
import { cn } from '@/lib/utils';

const statusTone: Record<DeviceStatus, 'pass' | 'fail' | 'pending'> = {
  online: 'pass', offline: 'fail', maintenance: 'pending',
};
const statusLabel: Record<DeviceStatus, string> = {
  online: '在线', offline: '离线', maintenance: '维护中',
};

const deviceTypes = ['空间芯片夹', '液滴生成设备', 'Chip Holder', '切片设备', '成像设备', '离心设备', '样本质检', '温控设备', '文库质检'];
const protocols = ['器械登记', '原生程序 · 空间转录组', '只读状态采集', 'Dry-run adapter'];
const statusOptions: (DeviceStatus | 'ALL')[] = ['ALL', 'online', 'offline', 'maintenance'];

const capabilityModel = [
  { label: '动作', value: 'capture · incubate · centrifuge' },
  { label: '参数', value: '温度 · 时间 · 速度 · 位置' },
  { label: '前置条件', value: '校准 · 芯片装载 · 盖板闭合' },
  { label: '禁止操作', value: '未审批真实设备调用' },
];

const PAGE_SIZE = 8;

const emptyForm = { name: '', type: deviceTypes[0], id: '', protocol: protocols[0], role: '', status: 'online' as DeviceStatus };

const DevicesPage: React.FC = () => {
  const { devices, addDevice, updateDevice, deleteDevice } = useExperiment();

  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const matchKw = !keyword || d.name.toLowerCase().includes(keyword.toLowerCase()) || d.id.toLowerCase().includes(keyword.toLowerCase());
      const matchType = typeFilter === 'ALL' || d.type === typeFilter;
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchKw && matchType && matchStatus;
    });
  }, [devices, keyword, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (device: Device) => { setEditingId(device.id); setForm({ name: device.name, type: device.type, id: device.id, protocol: device.protocol, role: device.role, status: device.status }); setFormOpen(true); };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.id.trim()) { toast.error('请填写设备名称和设备 ID'); return; }
    if (editingId) {
      updateDevice(editingId, { name: form.name.trim(), type: form.type, protocol: form.protocol, role: form.role.trim() || '—', status: form.status });
      toast.success('设备信息已更新');
    } else {
      addDevice({ id: form.id.trim(), name: form.name.trim(), type: form.type, role: form.role.trim() || '—', protocol: form.protocol, state: '已登记', status: form.status });
      toast.success('新设备已加入设备库');
    }
    setFormOpen(false);
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6">
          <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Device Management / 03</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">设备管理</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">管理实验设备库，支持新增、编辑、删除和状态管理；设备能力可被实验 SOP 调用。</p>
        </div>

        {/* 统计 */}
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: '设备总数', value: devices.length, tone: 'text-foreground' },
            { label: '在线设备', value: devices.filter((d) => d.status === 'online').length, tone: 'text-primary' },
            { label: '维护中', value: devices.filter((d) => d.status === 'maintenance').length, tone: 'text-warning' },
            { label: '离线', value: devices.filter((d) => d.status === 'offline').length, tone: 'text-destructive' },
          ].map((m) => (
            <div key={m.label} className="panel-surface rounded-xl p-4">
              <small className="text-xs text-muted-foreground">{m.label}</small>
              <strong className={cn('mt-1 block font-mono-data text-2xl', m.tone)}>{String(m.value).padStart(2, '0')}</strong>
            </div>
          ))}
        </div>

        <Panel
          label="Device Library"
          title={`设备库 · ${filtered.length} 台`}
          tag={<Button size="sm" onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="mr-1.5 h-3.5 w-3.5" />新增设备</Button>}
        >
          {/* 操作栏 */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="按设备名称或 ID 搜索" className="pl-8 bg-secondary/50" />
            </div>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-secondary/50 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="ALL">全部类型</option>
              {deviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((s) => (
                <button key={s} type="button" onClick={() => { setStatusFilter(s); setPage(1); }} className={cn('rounded-md border px-2.5 py-1.5 font-mono-data text-[10px] uppercase tracking-wide transition-colors', statusFilter === s ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground')}>
                  {s === 'ALL' ? '全部状态' : statusLabel[s]}
                </button>
              ))}
            </div>
          </div>

          {/* 表格 */}
          <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-max text-left">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">设备 ID</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">设备名称</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">类型</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">角色</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">接口策略</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">状态</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((device, i) => (
                  <motion.tr key={device.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border/60 text-xs last:border-0 hover:bg-secondary/40">
                    <td className="whitespace-nowrap px-4 py-3 font-mono-data text-muted-foreground">{device.id}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-2 text-foreground">
                        <Cpu className="h-3.5 w-3.5 text-primary" />{device.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">{device.type}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{device.role}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono-data text-[10px] text-muted-foreground">{device.protocol}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge tone={statusTone[device.status]}>{statusLabel[device.status]}</StatusBadge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(device)} className="h-7 px-2 text-foreground hover:bg-secondary">
                          <Pencil className="mr-1 h-3.5 w-3.5" />编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(device.id)} className="h-7 px-2 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">没有匹配的设备</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>共 {filtered.length} 台</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7 p-0 text-foreground hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="px-2 font-mono-data text-foreground">{page} / {totalPages}</span>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7 p-0 text-foreground hover:bg-secondary"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </Panel>

        {/* 能力模型 */}
        <div className="mt-4">
          <Panel label="Capability Model" title="设备能力模型" tag={<StatusBadge tone="neutral">DeviceCapability</StatusBadge>}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {capabilityModel.map((cap) => (
                <div key={cap.label} className="rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                    <Settings className="h-3.5 w-3.5" />
                    <span className="text-xs">{cap.label}</span>
                  </div>
                  <strong className="font-mono-data text-xs text-foreground">{cap.value}</strong>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* 新增/编辑设备弹窗 */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? '编辑设备' : '新增设备'}</DialogTitle>
              <DialogDescription>{editingId ? '修改设备信息后保存，将更新设备库记录。' : '填写设备信息，加入设备库后默认状态为在线。'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="dev-name" className="text-xs text-muted-foreground">设备名称 <span className="text-destructive">*</span></Label>
                <Input id="dev-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例如：荧光显微镜 DMi8" className="bg-secondary/50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-type" className="text-xs text-muted-foreground">设备类型</Label>
                <select id="dev-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-secondary/50 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                  {deviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-id" className="text-xs text-muted-foreground">设备 ID <span className="text-destructive">*</span></Label>
                <Input id="dev-id" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} placeholder="例如：LAB-OPT-03" className="bg-secondary/50" disabled={!!editingId} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-role" className="text-xs text-muted-foreground">角色描述</Label>
                <Input id="dev-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="例如：DAPI / HE 成像" className="bg-secondary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dev-protocol" className="text-xs text-muted-foreground">接口策略</Label>
                  <select id="dev-protocol" value={form.protocol} onChange={(e) => setForm((f) => ({ ...f, protocol: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-secondary/50 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                    {protocols.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dev-status" className="text-xs text-muted-foreground">状态</Label>
                  <select id="dev-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DeviceStatus }))} className="h-9 w-full rounded-md border border-input bg-secondary/50 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                    <option value="online">在线</option>
                    <option value="offline">离线</option>
                    <option value="maintenance">维护中</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setFormOpen(false)} className="hover:bg-secondary/80">取消</Button>
              <Button onClick={handleSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90">{editingId ? '保存修改' : '加入设备库'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认 */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>删除设备？</AlertDialogTitle>
              <AlertDialogDescription>此操作不可撤销，设备将从设备库中永久移除。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteTarget) { deleteDevice(deleteTarget); toast.success('设备已删除'); } setDeleteTarget(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </WorkspaceLayout>
  );
};

export default DevicesPage;