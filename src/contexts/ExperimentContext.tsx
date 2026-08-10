import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { mockExperiments, devices as defaultDevices, defaultMetrics } from '@/data/mockData';
import type { Device, Experiment, Metric, SampleData, TraceItem, VisionStatus } from '@/types/experiment';

interface ExperimentContextType {
  experiments: Experiment[];
  currentId: string;
  current: Experiment;
  traceItems: TraceItem[];
  devices: Device[];
  metrics: Metric[];
  switchExperiment: (id: string) => void;
  addExperiment: (data: { name: string; sampleType: string; target: string }) => void;
  updateExperiment: (id: string, patch: Partial<Experiment>) => void;
  archiveExperiment: (id: string) => void;
  deleteExperiment: (id: string) => void;
  runSopSequence: () => void;
  loadData: () => void;
  rerunVision: (stageIndex: number, title: string) => void;
  validateSample: (sample: SampleData) => void;
  addDevice: (device: Device) => void;
  updateDevice: (id: string, patch: Partial<Device>) => void;
  deleteDevice: (id: string) => void;
  addMetric: (metric: Metric) => void;
  updateMetric: (id: string, patch: Partial<Metric>) => void;
  deleteMetric: (id: string) => void;
}

const ExperimentContext = createContext<ExperimentContextType | null>(null);

export const ExperimentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [experiments, setExperiments] = useState<Experiment[]>(mockExperiments);
  const [currentId, setCurrentId] = useState<string>(mockExperiments[0].id);
  const [devices, setDevices] = useState<Device[]>(defaultDevices);
  const [metrics, setMetrics] = useState<Metric[]>(defaultMetrics);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = useMemo(
    () => experiments.find((e) => e.id === currentId) ?? experiments[0],
    [experiments, currentId]
  );

  const traceItems = useMemo(() => {
    if (!current) return [];
    const doneCount = current.sopCompleted ? 6 : Math.max(0, current.sopStage + 1);
    const titles = [
      { title: 'Goal Parser', detail: '解析实验目标与文档门槛' },
      { title: 'SOP Retriever', detail: '检索 SeekSpace 使用说明书' },
      { title: 'Device Matcher', detail: '匹配已注册设备能力' },
      { title: 'QC Gate', detail: '核悬液 QC 门槛校验' },
      { title: 'Vision Gate', detail: '多模态视觉结果复核' },
      { title: 'Artifact Linker', detail: '产物与来源文件链接' },
    ];
    return titles.map((t, i) => ({
      title: t.title,
      detail: t.detail,
      status: (i < doneCount ? 'done' : i === doneCount ? 'active' : 'pending') as TraceItem['status'],
    }));
  }, [current]);

  const switchExperiment = useCallback((id: string) => {
    setCurrentId(id);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateExperiment = useCallback((id: string, patch: Partial<Experiment>) => {
    setExperiments((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const addExperiment = useCallback((data: { name: string; sampleType: string; target: string }) => {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const seq = String(now.getTime()).slice(-4);
    const newExp: Experiment = {
      id: `SS-${stamp.slice(0, 10).replace(/-/g, '')}-${seq}`,
      name: data.name,
      status: 'READY',
      sampleType: data.sampleType,
      target: data.target,
      progress: 0,
      sopStage: -1,
      sopCompleted: false,
      dataLoaded: false,
      evidenceCount: 4,
      visionStatus: 'PASS',
      visionConfidence: 0.93,
      createdAt: stamp,
      sample: { nuclei: 182000, rate: 82, aggregation: 16, perReaction: 23500 },
    };
    setExperiments((prev) => [newExp, ...prev]);
  }, []);

  const archiveExperiment = useCallback((id: string) => {
    setExperiments((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'ARCHIVED' as const } : e)));
  }, []);

  const deleteExperiment = useCallback((id: string) => {
    setExperiments((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (id === currentId && next.length > 0) {
        setCurrentId(next[0].id);
      }
      return next;
    });
  }, [currentId]);

  const runSopSequence = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const id = currentId;
    updateExperiment(id, { status: 'RUNNING', sopStage: 0 });
    timerRef.current = setInterval(() => {
      setExperiments((prev) => {
        const exp = prev.find((e) => e.id === id);
        if (!exp) return prev;
        if (exp.sopStage >= 6) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return prev.map((e) =>
            e.id === id ? { ...e, sopStage: 6, sopCompleted: true, status: 'COMPLETE' as const, progress: 100, evidenceCount: 10 } : e
          );
        }
        const nextStage = exp.sopStage + 1;
        return prev.map((e) =>
          e.id === id
            ? { ...e, sopStage: nextStage, progress: Math.round(((nextStage + 1) / 7) * 100), evidenceCount: Math.min(8 + nextStage, 10) }
            : e
        );
      });
    }, 620);
  }, [currentId, updateExperiment]);

  const loadData = useCallback(() => {
    updateExperiment(currentId, { dataLoaded: true, evidenceCount: 10 });
  }, [currentId, updateExperiment]);

  const rerunVision = useCallback((stageIndex: number, title: string) => {
    updateExperiment(currentId, { visionStatus: 'ANALYZING' as VisionStatus });
    window.setTimeout(() => {
      updateExperiment(currentId, { visionStatus: 'PASS' as VisionStatus, visionConfidence: 0.93, evidenceCount: 10 });
    }, 900);
  }, [currentId, updateExperiment]);

  const validateSample = useCallback((sample: SampleData) => {
    updateExperiment(currentId, { sample });
  }, [currentId, updateExperiment]);

  const addDevice = useCallback((device: Device) => {
    setDevices((prev) => [device, ...prev]);
  }, []);

  const updateDevice = useCallback((id: string, patch: Partial<Device>) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const deleteDevice = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const addMetric = useCallback((metric: Metric) => {
    setMetrics((prev) => [metric, ...prev]);
  }, []);

  const updateMetric = useCallback((id: string, patch: Partial<Metric>) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const deleteMetric = useCallback((id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const value: ExperimentContextType = {
    experiments, currentId, current, traceItems, devices, metrics,
    switchExperiment, addExperiment, updateExperiment, archiveExperiment, deleteExperiment,
    runSopSequence, loadData, rerunVision, validateSample,
    addDevice, updateDevice, deleteDevice,
    addMetric, updateMetric, deleteMetric,
  };

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
};

export const useExperiment = () => {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error('useExperiment must be used within ExperimentProvider');
  return ctx;
};