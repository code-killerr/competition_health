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
  ExperimentId,
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
  /** 文档内可复现的区块位置。 */
  readonly location: string
  /** 区块正文。 */
  readonly content: string
  /** 区块内容类型。 */
  readonly kind?: 'text' | 'table'
  /** 区块所在页码。 */
  readonly page?: number
  /** 从文档标题层级推导的路径。 */
  readonly titlePath?: readonly string[]
  /** 表格列名；表格区块必须与行数据一起提供。 */
  readonly tableHeaders?: readonly string[]
  /** 表格中的一基行号；表头占用第 1 行。 */
  readonly tableRow?: number
}

/** 文档解析器接缝；解析失败必须由 Provider 显式记录。 */
export interface DocumentParser {
  /** 解析器的稳定名称。 */
  readonly name: string
  supports(name: string): boolean
  parse(
    input: { readonly name: string; readonly bytes: Iterable<number> },
  ): Promise<readonly ParsedDocumentBlock[]>
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
  readonly metadata_json: string | null
}

interface SearchRow {
  readonly block_id: string
  readonly document_id: string
  readonly version_id: string
  /** 文档内可复现的区块位置。 */
  readonly location: string
  /** 区块正文。 */
  readonly content: string
  readonly kind: 'text' | 'table'
  readonly page: number | null
  readonly title_path: string | null
  readonly table_headers: string | null
  readonly table_row: number | null
  readonly confirmed: number
  readonly conflicted: number
  readonly rank: number
}

interface EmbeddingRow {
  readonly block_id: string
  readonly document_id: string
  readonly version_id: string
  /** 文档内可复现的区块位置。 */
  readonly location: string
  /** 区块正文。 */
  readonly content: string
  readonly kind: 'text' | 'table'
  readonly page: number | null
  readonly title_path: string | null
  readonly table_headers: string | null
  readonly table_row: number | null
  readonly confirmed: number
  readonly conflicted: number
  readonly vector: string
}

type SqlParam = string | number | null

const OPEN_CONFLICT_SQL = "EXISTS (SELECT 1 FROM conflict_citations AS cc JOIN conflicts AS c ON c.id = cc.conflict_id WHERE cc.citation_id = 'citation-' || b.id AND c.status = 'OPEN')"

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
    const metadata = sourceMetadata(request, source)
    const existing = db.prepare('SELECT dv.id, dv.id AS version_id, dv.status, dv.error, d.metadata_json FROM document_versions AS dv JOIN documents AS d ON d.id = dv.document_id WHERE dv.content_hash = ?').get(hash) as DocumentRow | undefined
    if (existing !== undefined) return { documentId, versionId: brandId<'KnowledgeDocumentVersionId'>(existing.version_id), status: existing.status, metadata: parseMetadata(existing.metadata_json) ?? metadata }

    db.prepare('INSERT OR IGNORE INTO documents (id, name, metadata_json) VALUES (?, ?, ?)').run(documentId, source.name, JSON.stringify(metadata))
    db.prepare('INSERT INTO document_versions (id, document_id, content_hash, status, error, content) VALUES (?, ?, ?, ?, ?, ?)')
      .run(versionId, documentId, hash, 'QUEUED', null, source.bytes)
    db.prepare('UPDATE document_versions SET status = ? WHERE id = ?').run('PARSING', versionId)

    let blocks: readonly ParsedDocumentBlock[]
    try {
      blocks = await this.parse(source)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      db.prepare('UPDATE document_versions SET status = ?, error = ? WHERE id = ?').run('FAILED', message, versionId)
      return { documentId, versionId, status: 'FAILED', metadata }
    }

    db.prepare('UPDATE document_versions SET status = ? WHERE id = ?').run('INDEXING', versionId)
    db.exec('BEGIN')
    try {
      const insertBlock = db.prepare('INSERT INTO blocks (id, version_id, document_id, location, content, kind, page, title_path, table_headers, table_row, confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)')
      const insertFts = db.prepare('INSERT INTO blocks_fts (block_id, content, location, version_id) VALUES (?, ?, ?, ?)')
      const insertEmbedding = this.embeddingAdapter === undefined ? undefined : db.prepare('INSERT INTO block_embeddings (block_id, vector) VALUES (?, ?)')
      for (const [index, block] of blocks.entries()) {
        const content = block.content.trim()
        if (content.length === 0) continue
        const blockId = `block-${hash}-${index + 1}`
        const location = block.location.trim()
        const kind = block.kind ?? 'text'
        if (kind === 'table' && (block.tableHeaders === undefined || block.tableHeaders.length === 0)) throw new Error('table blocks require non-empty table headers')
        if (block.tableRow !== undefined && (!Number.isInteger(block.tableRow) || block.tableRow < 1)) throw new Error('table row must be a positive integer')
        const titlePath = block.titlePath === undefined ? null : JSON.stringify(block.titlePath)
        const tableHeaders = block.tableHeaders === undefined ? null : JSON.stringify(block.tableHeaders)
        insertBlock.run(
          blockId,
          versionId,
          documentId,
          location,
          content,
          kind,
          block.page ?? null,
          titlePath,
          tableHeaders,
          block.tableRow ?? null,
        )
        insertFts.run(blockId, content, location, versionId)
        if (insertEmbedding !== undefined) insertEmbedding.run(blockId, JSON.stringify(await this.vectorFor(content)))
      }
      db.prepare('UPDATE document_versions SET status = ?, error = NULL WHERE id = ?').run('READY', versionId)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      const message = error instanceof Error ? error.message : String(error)
      db.prepare('UPDATE document_versions SET status = ?, error = ? WHERE id = ?').run('FAILED', message, versionId)
      return { documentId, versionId, status: 'FAILED', metadata }
    }
    return { documentId, versionId, status: 'READY', metadata }
  }

  /** 读取导入状态。 */
  async getImportStatus(documentId: KnowledgeDocumentId, versionId?: KnowledgeDocumentVersionId): Promise<ImportStatusResult | undefined> {
    const db = await this.requireDatabase()
    const row = db.prepare(
      'SELECT dv.document_id AS id, dv.id AS version_id, dv.status, dv.error, d.metadata_json ' +
      'FROM document_versions AS dv JOIN documents AS d ON d.id = dv.document_id ' +
      'WHERE dv.document_id = ? AND (? IS NULL OR dv.id = ?) ' +
      'ORDER BY dv.rowid DESC LIMIT 1',
    ).get(documentId, versionId ?? null, versionId ?? null) as (DocumentRow & { id: string }) | undefined
    if (row === undefined) return undefined
    const metadata = parseMetadata(row.metadata_json)
    return { documentId, versionId: brandId<'KnowledgeDocumentVersionId'>(row.version_id), status: row.status, ...metadata === undefined ? {} : { metadata }, ...row.error === null ? {} : { error: row.error } }
  }

  /** 列出每份资料最近一次导入的状态。 */
  async listImportStatuses(): Promise<readonly ImportStatusResult[]> {
    const db = await this.requireDatabase()
    const rows = db.prepare(
      'SELECT dv.document_id AS id, dv.id AS version_id, dv.status, dv.error, d.metadata_json ' +
      'FROM document_versions AS dv JOIN documents AS d ON d.id = dv.document_id ' +
      'WHERE dv.rowid IN (SELECT MAX(rowid) FROM document_versions GROUP BY document_id) ' +
      'ORDER BY d.name ASC',
    ).all() as unknown as Array<DocumentRow & { id: string }>
    return rows.map((row) => {
      const metadata = parseMetadata(row.metadata_json)
      return {
        documentId: brandId<'KnowledgeDocumentId'>(row.id),
        versionId: brandId<'KnowledgeDocumentVersionId'>(row.version_id),
        status: row.status,
        ...metadata === undefined ? {} : { metadata },
        ...row.error === null ? {} : { error: row.error },
      }
    })
  }

  /** 使用 FTS5 和可选向量索引返回带来源的混合检索结果。 */
  async search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]> {
    const db = await this.requireDatabase()
    const query = ftsQuery(request.query)
    const limit = Math.min(Math.max(request.limit ?? 20, 1), 100)
    const filter = searchFilter(request)
    const keywordRows = query.length === 0 ? [] : db.prepare(`
      SELECT f.block_id, b.document_id, f.version_id, f.location, f.content, b.kind, b.page, b.title_path, b.table_headers, b.table_row, b.confirmed, ${OPEN_CONFLICT_SQL} AS conflicted, bm25(blocks_fts) AS rank
      FROM blocks_fts AS f JOIN blocks AS b ON b.id = f.block_id
      WHERE blocks_fts MATCH ?${filter.sql} ORDER BY rank ASC LIMIT ?
    `).all(query, ...filter.params, limit) as unknown as SearchRow[]
    const ranked = new Map<string, { row: SearchRow | EmbeddingRow; keyword: number; embedding: number }>()
    for (const row of keywordRows) ranked.set(row.block_id, { row, keyword: 1 / (1 + Math.abs(row.rank)), embedding: 0 })

    if (this.embeddingAdapter !== undefined) {
      const vector = await this.vectorFor(request.query)
      const rows = db.prepare(`
        SELECT b.id AS block_id, b.document_id, b.version_id, b.location, b.content, b.kind, b.page, b.title_path, b.table_headers, b.table_row, b.confirmed, ${OPEN_CONFLICT_SQL} AS conflicted, e.vector
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
    return [...ranked.values()]
      .map(({ row, keyword, embedding }) => searchResult(row, keywordWeight * keyword + embeddingWeight * embedding))
      .sort((left, right) => right.score - left.score || left.location.localeCompare(right.location))
      .slice(0, limit)
  }

  /** 返回 Provider 已登记的待处理冲突。 */
  async listConflicts(experimentId?: ExperimentId): Promise<readonly KnowledgeConflict[]> {
    const db = await this.requireDatabase()
    const rows = db.prepare('SELECT id, experiment_id, summary, status FROM conflicts WHERE (? IS NULL OR experiment_id = ?) ORDER BY rowid ASC').all(experimentId ?? null, experimentId ?? null) as Array<{ id: string; experiment_id: string | null; summary: string; status: KnowledgeConflictStatus }>
    return rows.map(row => ({
      conflictId: brandId<'KnowledgeConflictId'>(row.id),
      ...row.experiment_id === null ? {} : { experimentId: brandId<'ExperimentId'>(row.experiment_id) },
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
    const conflictId = `conflict-${createHash('sha256').update(`${request.experimentId ?? ''}\n${request.summary}\n${request.citationIds.join('\n')}`).digest('hex')}`
    db.prepare('INSERT OR IGNORE INTO conflicts (id, experiment_id, summary, status) VALUES (?, ?, ?, ?)').run(conflictId, request.experimentId ?? null, request.summary.trim(), 'OPEN')
    const insert = db.prepare('INSERT OR IGNORE INTO conflict_citations (conflict_id, citation_id) VALUES (?, ?)')
    for (const citationId of request.citationIds) insert.run(conflictId, citationId)
    return { conflictId: brandId<'KnowledgeConflictId'>(conflictId), ...request.experimentId === undefined ? {} : { experimentId: request.experimentId }, citationIds: request.citationIds, summary: request.summary.trim(), status: 'OPEN' }
  }

  /** 按引用 id 确认一个已导入区块。 */
  async confirmFact(request: ConfirmFactRequest): Promise<void> {
    const db = await this.requireDatabase()
    const blockId = citationBlockId(request.citationId)
    if (request.confirmedBy.trim().length === 0) throw new Error('confirmedBy must be non-blank')
    const block = db.prepare('SELECT id FROM blocks WHERE id = ?').get(blockId) as { id: string } | undefined
    if (block === undefined) throw new Error(`unknown citation "${request.citationId}"`)
    const openConflict = db.prepare("SELECT 1 AS found FROM conflict_citations AS cc JOIN conflicts AS c ON c.id = cc.conflict_id WHERE cc.citation_id = ? AND c.status = 'OPEN' LIMIT 1").get(request.citationId) as { found: number } | undefined
    if (openConflict !== undefined) throw new Error(`citation "${request.citationId}" belongs to an OPEN knowledge conflict`)
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
      CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, name TEXT NOT NULL, metadata_json TEXT) STRICT;
      CREATE TABLE IF NOT EXISTS document_versions (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id), content_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL, error TEXT, content BLOB NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS blocks (id TEXT PRIMARY KEY, version_id TEXT NOT NULL REFERENCES document_versions(id), document_id TEXT NOT NULL REFERENCES documents(id), location TEXT NOT NULL, content TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'text', page INTEGER, title_path TEXT, table_headers TEXT, table_row INTEGER, confirmed INTEGER NOT NULL DEFAULT 0) STRICT;
      CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(block_id UNINDEXED, content, location UNINDEXED, version_id UNINDEXED);
      CREATE TABLE IF NOT EXISTS block_embeddings (block_id TEXT PRIMARY KEY REFERENCES blocks(id), vector TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS fact_confirmations (id INTEGER PRIMARY KEY, block_id TEXT NOT NULL REFERENCES blocks(id), citation_id TEXT NOT NULL, confirmed_by TEXT NOT NULL, note TEXT, confirmed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP) STRICT;
      CREATE TABLE IF NOT EXISTS conflicts (id TEXT PRIMARY KEY, experiment_id TEXT, summary TEXT NOT NULL, status TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS conflict_citations (conflict_id TEXT NOT NULL REFERENCES conflicts(id), citation_id TEXT NOT NULL, PRIMARY KEY (conflict_id, citation_id)) STRICT;
    `)

    ensureColumn(db, 'documents', 'metadata_json', 'TEXT')
    ensureColumn(db, 'conflicts', 'experiment_id', 'TEXT')
    ensureColumn(db, 'blocks', 'kind', "TEXT NOT NULL DEFAULT 'text'")
    ensureColumn(db, 'blocks', 'page', 'INTEGER')
    ensureColumn(db, 'blocks', 'title_path', 'TEXT')
    ensureColumn(db, 'blocks', 'table_headers', 'TEXT')
    ensureColumn(db, 'blocks', 'table_row', 'INTEGER')
    return db
  }

  private async parse(source: { readonly name: string; readonly bytes: Uint8Array }): Promise<readonly ParsedDocumentBlock[]> {
    if (this.documentParser?.supports(source.name) === true) return await this.documentParser.parse(source)
    const extension = extname(source.name).toLowerCase()
    if (extension === '.pdf') throw new Error('parser unavailable for PDF input; install a configured document parser before publishing')
    const text = new TextDecoder().decode(source.bytes)
    if (extension === '.csv') return parseTableBlocks(text, ',')
    if (extension === '.tsv') return parseTableBlocks(text, '\t')
    return text.split(/\r?\n/).flatMap((line, index) => line.trim().length === 0 ? [] : [{ location: `line:${index + 1}`, content: line.trim(), kind: 'text' as const }])
  }

  private async vectorFor(text: string): Promise<readonly number[]> {
    if (this.embeddingAdapter === undefined) return []
    const vector = await this.embeddingAdapter.embed(text)
    if (vector.length === 0 || vector.some(value => !Number.isFinite(value))) throw new Error('embedding adapter returned an invalid vector')
    return vector
  }
}

function parseTableBlocks(text: string, delimiter: ',' | '\t'): readonly ParsedDocumentBlock[] {
  const rows = parseDelimitedRows(text, delimiter)
  if (rows.length === 0) return []
  const width = Math.max(...rows.map(row => row.length))
  const headers = Array.from({ length: width }, (_, index) => `column${index + 1}`)
  return rows.flatMap((row, index) => {
    if (row.every(cell => cell.trim().length === 0)) return []
    const tableRow = index + 1
    return [{
      location: `row:${tableRow}`,
      content: formatTableRow(headers, row),
      kind: 'table' as const,
      tableHeaders: headers,
      tableRow,
    }]
  })
}

function parseDelimitedRows(text: string, delimiter: ',' | '\t'): readonly (readonly string[])[] {
  const rows: string[][] = []
  const source = text.replace(/^\uFEFF/, '')
  let row: string[] = []
  let field = ''
  let quoted = false
  const pushRow = (): void => {
    rows.push(row)
    row = []
  }
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === undefined) continue
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
      continue
    }
    if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === delimiter) {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(field)
      field = ''
      pushRow()
    } else {
      field += character
    }
  }
  if (quoted) throw new Error('unterminated quoted table field')
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    pushRow()
  }
  return rows.filter(candidate => candidate.some(cell => cell.trim().length > 0))
}

function formatTableRow(headers: readonly string[], row: readonly string[]): string {
  return headers.map((header, index) => `${header}: ${(row[index] ?? '').trim()}`).join(' | ')
}

/** 把 Provider 注册到 Knowledge Service。 */
export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => {
    const provider = new LocalKnowledgeProvider(config)
    return ctx.labKnowledge.registerProvider(provider)
  }, 'lab-knowledge-local.provider')
}

function sourceMetadata(request: ImportDocumentRequest, source: { readonly name: string }): Readonly<Record<string, string>> {
  return { ...request.metadata, sourceKind: request.source.kind, sourceName: source.name }
}

function parseMetadata(value: string | null | undefined): Readonly<Record<string, string>> | undefined {
  if (value === null || value === undefined) return undefined
  const parsed: unknown = JSON.parse(value)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('stored document metadata is invalid')
  const metadata: Record<string, string> = {}
  for (const [key, item] of Object.entries(parsed)) {
    if (typeof item !== 'string') throw new Error('stored document metadata field ' + key + ' is invalid')
    metadata[key] = item
  }
  return metadata
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
    clauses.push(request.confirmed ? `b.confirmed = 1 AND NOT (${OPEN_CONFLICT_SQL})` : `(b.confirmed = 0 OR ${OPEN_CONFLICT_SQL})`)
  }
  return { sql: clauses.length === 0 ? '' : ` AND ${clauses.join(' AND ')}`, params }
}

function searchResult(row: SearchRow | EmbeddingRow, score: number): KnowledgeSearchResult {
  const titlePath = row.title_path === null ? undefined : parseTitlePath(row.title_path)
  return {
    citationId: brandId<'CitationId'>(`citation-${row.block_id}`),
    documentId: brandId<'KnowledgeDocumentId'>(row.document_id),
    versionId: brandId<'KnowledgeDocumentVersionId'>(row.version_id),
    location: row.location,
    excerpt: row.content,
    kind: row.kind,
    ...row.page === null ? {} : { page: row.page },
    ...titlePath === undefined ? {} : { titlePath },
    ...row.table_headers === null ? {} : { tableHeaders: parseTableHeaders(row.table_headers) },
    ...row.table_row === null ? {} : { tableRow: row.table_row },
    confirmed: row.confirmed === 1 && row.conflicted === 0,
    conflicted: row.conflicted === 1,
    score,
  }
}

function ftsQuery(query: string): string {
  return query.trim().split(/\s+/).filter(Boolean).map(term => `"${term.replaceAll('"', '""')}"`).join(' AND ')
}

function citationBlockId(citationId: CitationId): string {
  const prefix = 'citation-'
  if (!citationId.startsWith(prefix)) throw new Error(`invalid citation "${citationId}"`)
  return citationId.slice(prefix.length)
}

function parseTitlePath(value: string): readonly string[] {
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string')) throw new Error('stored title path is invalid')
  return parsed as readonly string[]
}

function parseTableHeaders(value: string): readonly string[] {
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string')) throw new Error('stored table headers are invalid')
  return parsed as readonly string[]
}

function parseVector(value: string): readonly number[] {
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'number' || !Number.isFinite(item))) throw new Error('stored embedding vector is invalid')
  return parsed as readonly number[]
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length === 0) return 0
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index]
    const rightValue = right[index]
    if (leftValue === undefined || rightValue === undefined) throw new Error('embedding vector index is missing')
    dot += leftValue * rightValue
    leftNorm += leftValue * leftValue
    rightNorm += rightValue * rightValue
  }
  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / Math.sqrt(leftNorm * rightNorm)
}
