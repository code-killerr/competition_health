// 实验控制台全局类型定义

export type RunState = 'READY' | 'RUNNING' | 'COMPLETE' | 'ARCHIVED';

export type ExperimentStatus = RunState;

export type StepStatus = 'pending' | 'active' | 'done';

export type TraceStatus = 'done' | 'active' | 'pending';

export type GateStatus = 'PASS' | 'HOLD' | 'WAITING';

export type VisionStatus = 'PASS' | 'ANALYZING' | 'FAIL';

export type DeviceStatus = 'online' | 'offline' | 'maintenance';

export interface Device {
  id: string;
  name: string;
  type: string;
  role: string;
  protocol: string;
  state: string;
  status: DeviceStatus;
}

export interface Experiment {
  id: string;
  name: string;
  status: ExperimentStatus;
  sampleType: string;
  target: string;
  progress: number;
  sopStage: number;
  sopCompleted: boolean;
  dataLoaded: boolean;
  evidenceCount: number;
  visionStatus: VisionStatus;
  visionConfidence: number;
  createdAt: string;
  sample: SampleData;
}

export interface SopStep {
  code: string;
  name: string;
  short: string;
  duration: string;
  gate: string;
  evidence: string[];
  reference: string;
}

export interface TraceItem {
  title: string;
  detail: string;
  status: TraceStatus;
}

export interface Gate {
  name: string;
  value: string;
  detail: string;
  status: GateStatus;
}

export interface Library {
  name: string;
  value: string;
  peak: string;
  rule: string;
  status: GateStatus;
  marker: string;
  bars: number[];
}

export interface VisionCheck {
  object: string;
  detail: string;
  confidence: number;
}

export interface EvidenceMarker {
  label: string;
  status: string;
  confidence: number;
  left: string;
  top: string;
  width?: string;
  height?: string;
}

export interface StageEvidence {
  code: string;
  title: string;
  short: string;
  configTitle: string;
  configRule: string;
  gate: string;
  processLabel: string;
  processCaption: string;
  processImage: string;
  processSource: string;
  resultLabel: string;
  resultCaption: string;
  resultImage: string;
  resultSource: string;
  checks: VisionCheck[];
  processMarkers: EvidenceMarker[];
  resultMarkers: EvidenceMarker[];
  resultReview?: boolean;
}

export interface AgentReferenceBasis {
  label: string;
  value: string;
  source: string;
}

export interface InputFile {
  name: string;
  file: string;
  status: 'required' | 'linked';
}

export interface Artifact {
  name: string;
  detail: string;
  type: string;
}

export interface EventLogItem {
  time: string;
  event: string;
  detail: string;
  actor: string;
}

export interface SampleData {
  nuclei: number;
  rate: number;
  aggregation: number;
  perReaction: number;
}