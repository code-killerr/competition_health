/** 使用 Node SQLite 与 FTS5 的本地知识库 Provider。 */

import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  CitationId,
  KnowledgeConflict,
  KnowledgeConflictStatus,
  KnowledgeDocumentId,
  KnowledgeDocumentVersionId,
  KnowledgeImportStatus,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  ConfirmFactRequest,
  ImportDocumentRequest,
  ImportDocumentResult,
  ImportStatusResult,
  KnowledgeProvider,
  RecordConflictRequest,
} from '@deepseek-ai/dsh-experimental-lab-knowledge'

/** 解析后供 Knowledge Provider 持久化的标准区块。 */
export interface ParsedDocumentBlock {
  readonly location: string
  readonly content: string
  readonly kind?: 'text' | 'table'
  readonly page?: number
  readonly titlePath?: readonly string[]
}

/** 文档解析器接缝；解析失败必须由 Provider 显式记录。 */
export interface DocumentParser {
  readonly name: string
  supports(name: string): boolean
  parse(input: { readonly name: string; readonly bytes: Uint8Array }): Promise<readonly ParsedDocumentBlock[]>
}

/** 可选的向量生成接缝；首轮没有适配器时只使用 FTS5。 */
export interface EmbeddingAdapter {
  embed(text: string): Promise<readonly number[]>
}

/** 本地知识 Provider 配置。 */
export interface Config {
  /** SQLite 数据库路径；测试可显式传 `:memory:`。 */
  readonly path: string
  /** 可选向量适配器。 */
  readonly embeddingAdapter?: EmbeddingAdapter
  /** 可选文档解析器；未提供时仅使用内置文本/CSV 解析。 */
  readonly documentParser?: DocumentParser
  /** 混合检索的关键词权重。 */
  readonly keywordWeight?: number
  /** 混合检索的向量权重。 */
  readonly embeddingWeight?: number
}

/** Loader 使用的本地知识 Provider 配置 schema。 */
export const Config: z<Config> = z.object({
  path: z.string().required(),
  keywordWeight: z.number().min(0).default(0.7),
  embeddingWeight: z.number().min(0).default(0.3),
})

/** Cordis 插件名称。 */
export const name = 'lab-knowledge-local'
/** 依赖 Knowledge Service。 */
export const inject = ['labKnowledge']

interface DocumentRow {
  readonly id: string
  readonly version_id: string
  readonly status: KnowledgeImportStatus
  readonly error: string | null
}

interface SearchRow {
  readonly block_id: string
  readonly document_id: string
  readonly version_id: string
  readonly location: string
  readonly content: string
  readonly confirmed: number
  readonly rank: number
}

interface EmbeddingRow {
  readonly block_id: string
  readonly document_id: string
  readonly version_id: string
  readonly location: string
  readonly content: string
  readonly confirmed: number
  readonly vector: string
}

type SqlParam = string | number | null

/** Provider-owned SQLite/FTS5 知识库。 */
export class LocalKnowledgeProvider implements KnowledgeProvider {
  readonly name = 'local-sqlite'
  private readonly path: string
  private readonly embeddingAdapter: EmbeddingAdapter | undefined
  private readonly documentParser: DocumentParser | undefined
  private readonly keywordWeight: number
  private readonly embeddingWeight: number
  private database: Promise<DatabaseSync> | undefined
  private closed = false

  constructor(config: Config) {
    this.path = config.path
    this.embeddingAdapter = config.embeddingAdapter
    this.documentParser = config.documentParser
    this.keywordWeight = config.keywordWeight ?? 0.7
    this.embeddingWeight = config.embeddingWeight ?? 0.3
    if (this.keywordWeight < 0 || this.embeddingWeight < 0 || this.keywordWeight + this.embeddingWeight === 0) {
      throw new Error('knowledge search weights must be non-negative and not both zero')
    }
  }

  /** 登记不可变资料版本并生成结构化文本区块。 */
  async importDocument(request: ImportDocumentRequest): Promise<ImportDocumentResult> {
    const db = await this.requireDatabase()
    const source = await readSource(request)
    const hash = createHash('sha256').update(source.bytes).digest('hex')
    const documentId = brandId<'KnowledgeDocumentId'>(`document-${hash}`)
    const versionId = brandId<'KnowledgeDocumentVersionId'>(`version-${hash}`)
    const existing = db.prepare('SELECT id, id AS version_id, status, error FROM document_versions WHERE content_hash = ?').get(hash) as DocumentRow | undefined
    if (existing !== undefined) return { documentId, versionId: brandId<'KnowledgeDocumentVersionId'>(existing.version_id), status: existing.status }

    db.prepare('INSERT OR IGNORE INTO documents (id, name) VALUES (?, ?)').run(documentId, source.name)
    db.prepare('INSERT INTO document_versions (id, document_id, content_hash, status, error, content) VALUES (?, ?, ?, ?, ?, ?)')
      .run(versionId, documentId, hash, 'PARSING', null, source.bytes)

    let blocks: readonly ParsedDocumentBlock[]
    try {
      blocks = await this.parse(source)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      db.prepare('UPDATE document_versions SET status = ?, error = ? WHERE id = ?').run('FAILED', message, versionId)
      return { documentId, versionId, status: 'FAILED' }
    }

    db.exec('BEGIN')
    try {
      const insertBlock = db.prepare('INSERT INTO blocks (id, version_id, document_id, location, content, kind, page, title_path, confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)')
      const insertFts = db.prepare('INSERT INTO blocks_fts (block_id, content, location, version_id) VALUES (?, ?, ?, ?)')
      const insertEmbedding = this.embeddingAdapter === undefined ? undefined : db.prepare('INSERT INTO block_embeddings (block_id, vector) VALUES (?, ?)')
      for (const [index, block] of blocks.entries()) {
        const content = block.content.trim()
        if (content.length === 0) continue
        const blockId = `block-${hash}-${index + 1}`
        const location = block.location.trim()
        insertBlock.run(blockId, versionId, documentId, location, content, block.kind ?? 'text', block.page ?? null, block.titlePath === undefined ? null : JSON.stringify(block.titlePath))
        insertFts.run(blockId, content, location, versionId)
        if (insertEmbedding !== undefined) insertEmbedding.run(blockId, JSON.stringify(await this.vectorFor(content)))
      }
      db.prepare('UPDATE document_versions SET status = ?, error = NULL WHERE id = ?').run('READY', versionId)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      const message = error instanceof Error ? error.message : String(error)
      db.prepare('UPDATE document_versions SET status = ?, error = ? WHERE id = ?').run('FAILED', message, versionId)
      return { documentId, versionId, status: 'FAILED' }
    }
    return { documentId, versionId, status: 'READY' }
  }

  /** 读取导入状态。 */
  async getImportStatus(documentId: KnowledgeDocumentId, versionId?: KnowledgeDocumentVersionId): Promise<ImportStatusResult | undefined> {
    const db = await this.requireDatabase()
    const row = db.prepare(`SELECT document_id AS id, id AS version_id, status, error FROM document_versions WHERE document_id = ? AND (? IS NULL OR id = ?) ORDER BY rowid DESC LIMIT 1`).get(documentId, versionId ?? null, versionId ?? null) as (DocumentRow & { id: string }) | undefined
    if (row === undefined) return undefined
    return { documentId, versionId: brandId<'KnowledgeDocumentVersionId'>(row.version_id), status: row.status, ...row.error === null ? {} : { error: row.error } }
  }

  /** 使用 FTS5 和可选向量索引返回带来源的混合检索结果。 */
  async search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]> {
    const db = await this.requireDatabase()
    const query = ftsQuery(request.query)
    const limit = Math.min(Math.max(request.limit ?? 20, 1), 100)
    const filter = searchFilter(request)
    const keywordRows = query.length === 0 ? [] : db.prepare(`
      SELECT f.block_id, b.document_id, f.version_id, f.location, f.content, b.confirmed, bm25(blocks_fts) AS rank
      FROM blocks_fts AS f JOIN blocks AS b ON b.id = f.block_id
      WHERE blocks_fts MATCH ?${filter.sql} ORDER BY rank ASC LIMIT ?
    `).all(query, ...filter.params, limit) as unknown as SearchRow[]
    const ranked = new Map<string, { row: SearchRow | EmbeddingRow; keyword: number; embedding: number }>()
    for (const row of keywordRows) ranked.set(row.block_id, { row, keyword: 1 / (1 + Math.abs(row.rank)), embedding: 0 })

    if (this.embeddingAdapter !== undefined) {
      const vector = await this.vectorFor(request.query)
      const rows = db.prepare(`
        SELECT b.id AS block_id, b.document_id, b.version_id, b.location, b.content, b.confirmed, e.vector
        FROM block_embeddings AS e JOIN blocks AS b ON b.id = e.block_id
        WHERE 1 = 1${filter.sql}
      `).all(...filter.params) as unknown as EmbeddingRow[]
      for (const row of rows) {
        const embedding = Math.max(cosineSimilarity(vector, parseVector(row.vector)), 0)
        const existing = ranked.get(row.block_id)
        if (existing === undefined) {
          if (embedding > 0) ranked.set(row.block_id, { row, keyword: 0, embedding })
          continue
        }
        existing.embedding = embedding
      }
    }

    const keywordWeight = this.embeddingAdapter === undefined ? 1 : this.keywordWeight
    const embeddingWeight = this.embeddingAdapter === undefined ? 0 : this.embeddingWeight
    return [...ranked.values()].map(({ row, keyword, embedding }) => ({
      citationId: brandId<'CitationId'>(`citation-${row.block_id}`),
      documentId: brandId<'KnowledgeDocumentId'>(row.document_id),
      versionId: brandId<'KnowledgeDocumentVersionId'>(row.version_id),
      location: row.location,
      excerpt: row.content,
      confirmed: row.confirmed === 1,
      score: keywordWeight * keyword + embeddingWeight * embedding,
    })).sort((left, right) => right.score - left.score || left.location.localeCompare(right.location)).slice(0, limit)
  }

  /** 返回 Provider 已登记的待处理冲突。 */
  async listConflicts(): Promise<readonly KnowledgeConflict[]> {
    const db = await this.requireDatabase()
    const rows = db.prepare('SELECT id, summary, status FROM conflicts ORDER BY rowid ASC').all() as Array<{ id: string; summary: string; status: KnowledgeConflictStatus }>
    return rows.map(row => ({
      conflictId: brandId<'KnowledgeConflictId'>(row.id),
      citationIds: (db.prepare('SELECT citation_id FROM conflict_citations WHERE conflict_id = ? ORDER BY rowid ASC').all(row.id) as Array<{ citation_id: string }>).map(item => brandId<'CitationId'>(item.citation_id)),
      summary: row.summary,
      status: row.status,
    }))
  }

  /** 登记两条或多条有效引用之间的冲突。 */
  async recordConflict(request: RecordConflictRequest): Promise<KnowledgeConflict> {
    const db = await this.requireDatabase()
    if (request.citationIds.length < 2) throw new Error('a knowledge conflict requires at least two citations')
    if (request.summary.trim().length === 0) throw new Error('knowledge conflict summary must be non-blank')
    const blockIds = request.citationIds.map(citationBlockId)
    const placeholders = blockIds.map(() => '?').join(', ')
    const rows = db.prepare(`SELECT id FROM blocks WHERE id IN (${placeholders})`).all(...blockIds) as Array<{ id: string }>
    if (rows.length !== new Set(blockIds).size) throw new Error('knowledge conflict contains an unknown citation')
    const conflictId = `conflict-${createHash('sha256').update(`${request.summary}\n${request.citationIds.join('\n')}`).digest('hex')}`
    db.prepare('INSERT OR IGNORE INTO conflicts (id, summary, status) VALUES (?, ?, ?)').run(conflictId, request.summary.trim(), 'OPEN')
    const insert = db.prepare('INSERT OR IGNORE INTO conflict_citations (conflict_id, citation_id) VALUES (?, ?)')
    for (const citationId of request.citationIds) insert.run(conflictId, citationId)
    return { conflictId: brandId<'KnowledgeConflictId'>(conflictId), citationIds: request.citationIds, summary: request.summary.trim(), status: 'OPEN' }
  }

  /** 按引用 id 确认一个已导入区块。 */
  async confirmFact(request: ConfirmFactRequest): Promise<void> {
    const db = await this.requireDatabase()
    const blockId = citationBlockId(request.citationId)
    if (request.confirmedBy.trim().length === 0) throw new Error('confirmedBy must be non-blank')
    const block = db.prepare('SELECT id FROM blocks WHERE id = ?').get(blockId) as { id: string } | undefined
    if (block === undefined) throw new Error(`unknown citation "${request.citationId}"`)
    db.prepare('UPDATE blocks SET confirmed = 1 WHERE id = ?').run(blockId)
    db.prepare('INSERT INTO fact_confirmations (block_id, citation_id, confirmed_by, note) VALUES (?, ?, ?, ?)').run(blockId, request.citationId, request.confirmedBy.trim(), request.note ?? null)
  }

  /** 删除并重建 FTS5 与可选向量索引。 */
  async rebuildIndex(): Promise<void> {
    const db = await this.requireDatabase()
    db.exec('DELETE FROM blocks_fts')
    db.exec('INSERT INTO blocks_fts (block_id, content, location, version_id) SELECT id, content, location, version_id FROM blocks')
    if (this.embeddingAdapter !== undefined) {
      db.exec('DELETE FROM block_embeddings')
      const insert = db.prepare('INSERT INTO block_embeddings (block_id, vector) VALUES (?, ?)')
      for (const row of db.prepare('SELECT id, content FROM blocks').all() as Array<{ id: string; content: string }>) insert.run(row.id, JSON.stringify(await this.vectorFor(row.content)))
    }
  }

  /** 关闭 Provider-owned 数据库。 */
  async dispose(): Promise<void> {
    this.closed = true
    const database = this.database
    this.database = undefined
    if (database !== undefined) (await database).close()
  }

  private requireDatabase(): Promise<DatabaseSync> {
    if (this.closed) return Promise.reject(new Error('local knowledge provider is closed'))
    this.database ??= this.openDatabase()
    return this.database
  }

  private async openDatabase(): Promise<DatabaseSync> {
    if (this.path !== ':memory:') await mkdir(dirname(this.path), { recursive: true, mode: 0o700 })
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(this.path)
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, name TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS document_versions (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id), content_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL, error TEXT, content BLOB NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS blocks (id TEXT PRIMARY KEY, version_id TEXT NOT NULL REFERENCES document_versions(id), document_id TEXT NOT NULL REFERENCES documents(id), location TEXT NOT NULL, content TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'text', page INTEGER, title_path TEXT, confirmed INTEGER NOT NULL DEFAULT 0) STRICT;
      CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(block_id UNINDEXED, content, location UNINDEXED, version_id UNINDEXED);
      CREATE TABLE IF NOT EXISTS block_embeddings (block_id TEXT PRIMARY KEY REFERENCES blocks(id), vector TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS fact_confirmations (id INTEGER PRIMARY KEY, block_id TEXT NOT NULL REFERENCES blocks(id), citation_id TEXT NOT NULL, confirmed_by TEXT NOT NULL, note TEXT, confirmed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP) STRICT;
      CREATE TABLE IF NOT EXISTS conflicts (id TEXT PRIMARY KEY, summary TEXT NOT NULL, status TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS conflict_citations (conflict_id TEXT NOT NULL REFERENCES conflicts(id), citation_id TEXT NOT NULL, PRIMARY KEY (conflict_id, citation_id)) STRICT;
    `)
    ensureColumn(db, 'blocks', 'kind', "TEXT NOT NULL DEFAULT 'text'")
    ensureColumn(db, 'blocks', 'page', 'INTEGER')
    ensureColumn(db, 'blocks', 'title_path', 'TEXT')
    return db
  }

  private async parse(source: { readonly name: string; readonly bytes: Uint8Array }): Promise<readonly ParsedDocumentBlock[]> {
    if (this.documentParser?.supports(source.name) === true) return await this.documentParser.parse(source)
    if (extname(source.name).toLowerCase() === '.pdf') throw new Error('parser unavailable for PDF input; install a configured document parser before publishing')
    const text = new TextDecoder().decode(source.bytes)
    const isTable = ['.csv', '.tsv'].includes(extname(source.name).toLowerCase())
    return text.split(/\r?\n/).flatMap((line, index) => line.trim().length === 0 ? [] : [{ location: `${isTable ? 'row' : 'line'}:${index + 1}`, content: line.trim(), kind: isTable ? 'table' as const : 'text' as const }])
  }

  private async vectorFor(text: string): Promise<readonly number[]> {
    if (this.embeddingAdapter === undefined) return []
    const vector = await this.embeddingAdapter.embed(text)
    if (vector.length === 0 || vector.some(value => !Number.isFinite(value))) throw new Error('embedding adapter returned an invalid vector')
    return vector
  }
}

/** 把 Provider 注册到 Knowledge Service。 */
export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => {
    const provider = new LocalKnowledgeProvider(config)
    return ctx.labKnowledge.registerProvider(provider)
  }, 'lab-knowledge-local.provider')
}

async function readSource(request: ImportDocumentRequest): Promise<{ name: string; bytes: Uint8Array }> {
  if (request.source.kind === 'bytes') return { name: request.source.name, bytes: request.source.bytes }
  const { readFile } = await import('node:fs/promises')
  return { name: request.source.path, bytes: await readFile(request.source.path) }
}

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!columns.some(entry => entry.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

function searchFilter(request: KnowledgeSearchRequest): { sql: string; params: SqlParam[] } {
  const clauses: string[] = []
  const params: SqlParam[] = []
  if (request.documentIds !== undefined && request.documentIds.length > 0) {
    clauses.push(`b.document_id IN (${request.documentIds.map(() => '?').join(', ')})`)
    params.push(...request.documentIds)
  }
  if (request.versionIds !== undefined && request.versionIds.length > 0) {
    clauses.push(`b.version_id IN (${request.versionIds.map(() => '?').join(', ')})`)
    params.push(...request.versionIds)
  }
  if (request.confirmed !== undefined) {
    clauses.push('b.confirmed = ?')
    params.push(request.confirmed ? 1 : 0)
  }
  return { sql: clauses.length === 0 ? '' : ` AND ${clauses.join(' AND ')}`, params }
}

function ftsQuery(query: string): string {
  return query.trim().split(/\s+/).filter(Boolean).map(term => `"${term.replaceAll('"', '""')}"`).join(' AND ')
}

function citationBlockId(citationId: CitationId): string {
  const prefix = 'citation-'
  if (!citationId.startsWith(prefix)) throw new Error(`invalid citation "${citationId}"`)
  return citationId.slice(prefix.length)
}

function parseVector(value: string): readonly number[] {
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'number' || !Number.isFinite(item))) throw new Error('stored embedding vector is invalid')
  return parsed
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length === 0) return 0
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index]!
    const rightValue = right[index]!
    dot += leftValue * rightValue
    leftNorm += leftValue * leftValue
    rightNorm += rightValue * rightValue
  }
  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / Math.sqrt(leftNorm * rightNorm)
}
