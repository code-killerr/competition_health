/** Runtime 权威状态的 SQLite 仓储；每个实验状态整体替换，避免部分写入。 */

import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type {
  LabRuntimeStateStore,
  RuntimeExperimentState,
} from '@deepseek-ai/dsh-experimental-lab-runtime'

/** 基于 Node SQLite 的 Runtime 状态仓储。 */
export class SqliteRuntimeStateStore implements LabRuntimeStateStore {
  private readonly database: Promise<DatabaseSync>
  private closed = false

  constructor(private readonly path: string) {
    this.database = this.open()
    this.database.catch(() => {})
  }

  /** 读取全部实验权威状态。 */
  async load(): Promise<readonly RuntimeExperimentState[]> {
    const database = await this.requireDatabase()
    return (database.prepare('SELECT state_json FROM experiments ORDER BY experiment_id').all() as Array<{ state_json: string }>)
      .map(row => decodeState(JSON.parse(row.state_json) as unknown))
  }

  /** 整体替换一个实验状态。 */
  async save(state: RuntimeExperimentState): Promise<void> {
    const database = await this.requireDatabase()
    database.prepare(`
      INSERT INTO experiments (experiment_id, state_json)
      VALUES (?, ?)
      ON CONFLICT(experiment_id) DO UPDATE SET state_json = excluded.state_json
    `).run(state.request.experimentId, JSON.stringify(state))
  }

  /** 关闭 SQLite 连接。 */
  async dispose(): Promise<void> {
    this.closed = true
    const database = await this.database
    database.close()
  }

  private async open(): Promise<DatabaseSync> {
    if (this.path !== ':memory:') await mkdir(dirname(this.path), { recursive: true, mode: 0o700 })
    const { DatabaseSync } = await import('node:sqlite')
    const database = new DatabaseSync(this.path)
    database.exec('CREATE TABLE IF NOT EXISTS experiments (experiment_id TEXT PRIMARY KEY, state_json TEXT NOT NULL) STRICT')
    return database
  }

  private async requireDatabase(): Promise<DatabaseSync> {
    if (this.closed) throw new Error('runtime state store is closed')
    return this.database
  }
}

function decodeState(value: unknown): RuntimeExperimentState {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 2) {
    throw new Error('unsupported runtime state version')
  }
  return value as RuntimeExperimentState
}

/** 测试和显式内存组合使用的 Runtime 状态仓储。 */
export class InMemoryRuntimeStateStore implements LabRuntimeStateStore {
  private readonly states = new Map<string, RuntimeExperimentState>()

  /** 返回状态快照。 */
  load(): Promise<readonly RuntimeExperimentState[]> {
    return Promise.resolve([...this.states.values()].map(state => structuredClone(state)))
  }

  /** 保存状态快照。 */
  save(state: RuntimeExperimentState): Promise<void> {
    this.states.set(state.request.experimentId, structuredClone(state))
    return Promise.resolve()
  }
}
