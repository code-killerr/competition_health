import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, watch, type Dirent, type FSWatcher } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import type { LabProjectFileDownload, LabProjectFilePreview, LabProjectFileRecord, LabProjectFileRevisionEvent } from './project-protocol.ts'

const PROJECT_FILE_GROUPS = ['configuration', 'conversation-output', 'run-artifacts'] as const
const PREVIEW_MAX_BYTES = 2 * 1024 * 1024

type ProjectFileGroup = typeof PROJECT_FILE_GROUPS[number]
type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }

/** 以一个已授权 Workspace 为根目录的 Host 项目文件目录。 */
export class LabProjectFileCatalog {
  private readonly records = new Map<string, Map<string, LabProjectFileRecord>>()
  private readonly watchers = new Map<string, FSWatcher>()
  private disposed = false

  constructor(
    private readonly onRevision: (event: LabProjectFileRevisionEvent) => void,
    private readonly shouldWatch: () => boolean = () => false,
  ) {}

  /** 读取三个固定 Project 目录的元数据，并启动 revision 观察。
   * @param projectId - Project identifier used to scope records and revisions.
   * @param workspacePath - authorized Workspace root directory.
   * @returns - sorted metadata records from the fixed Project directories.
   */
  async list(projectId: string, workspacePath: string): Promise<readonly LabProjectFileRecord[]> {
    const next = new Map<string, LabProjectFileRecord>()
    for (const group of PROJECT_FILE_GROUPS) {
      await scanDirectory(join(workspacePath, group), group, projectId, next)
    }
    const previous = this.records.get(projectId)
    if (previous !== undefined) {
      for (const file of next.values()) {
        const old = previous.get(file.relativePath)
        if (old !== undefined && (old.digest !== file.digest || old.size !== file.size)) {
          next.set(file.relativePath, { ...file, revision: old.revision + 1 })
        }
      }
    }
    this.records.set(projectId, next)
    if (previous !== undefined) {
      for (const file of next.values()) {
        const old = previous.get(file.relativePath)
        if (old === undefined || old.digest !== file.digest || old.size !== file.size) {
          this.onRevision({
            type: 'project-file-revision',
            projectId: file.projectId,
            projectFileId: file.projectFileId,
            group: file.group,
            revision: file.revision,
          })
        }
      }
    }
    if (this.shouldWatch()) this.watchProject(projectId, workspacePath)
    return [...next.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath))
  }

  /** 只读取当前已授权的文件记录，并返回安全预览。
   * @param projectId - Project identifier used for authorization.
   * @param workspacePath - authorized Workspace root directory.
   * @param projectFileId - opaque Project file identifier.
   * @returns - safe text, JSON, image or unsupported preview.
   */
  async open(projectId: string, workspacePath: string, projectFileId: string): Promise<LabProjectFilePreview> {
    const file = await this.authorizedFile(projectId, workspacePath, projectFileId)
    const path = safePath(workspacePath, file.relativePath)
    if (file.size > PREVIEW_MAX_BYTES) return { kind: 'unsupported' }
    if (file.mediaType.startsWith('image/')) {
      const bytes = await readFile(path)
      return { kind: 'image', src: `data:${file.mediaType};base64,${bytes.toString('base64')}`, alt: file.displayName }
    }
    if (file.mediaType === 'application/json' || file.mediaType.startsWith('text/')) {
      const content = await readFile(path, 'utf8')
      if (file.mediaType === 'application/json') {
        try {
          return { kind: 'json', content: JSON.parse(content) as JsonValue }
        } catch {
          return { kind: 'text', content }
        }
      }
      return { kind: 'text', content }
    }
    return { kind: 'unsupported' }
  }

  /** 重新检查 Project 授权后签发不透明的 Host 下载句柄。
   * @param projectId - Project identifier used for authorization.
   * @param workspacePath - authorized Workspace root directory.
   * @param projectFileId - opaque Project file identifier.
   * @returns - metadata and an opaque Host download handle.
   */
  async download(projectId: string, workspacePath: string, projectFileId: string): Promise<LabProjectFileDownload> {
    const file = await this.authorizedFile(projectId, workspacePath, projectFileId)
    return { projectFileId: file.projectFileId, displayName: file.displayName, mediaType: file.mediaType, downloadToken: `project-file-${randomUUID()}` }
  }

  /** Write Host-generated content under one fixed Project file group.
   * @param projectId - Project identifier used to scope the record.
   * @param workspacePath - authorized Workspace root directory.
   * @param group - fixed Project file category selected by the Host operation.
   * @param relativePath - path relative to the selected category, never absolute.
   * @param content - bytes generated by an authorized Host capability.
   * @returns - refreshed metadata for the written file.
   */
  async write(
    projectId: string,
    workspacePath: string,
    group: ProjectFileGroup,
    relativePath: string,
    content: string | Uint8Array,
  ): Promise<LabProjectFileRecord> {
    const normalized = relativePath.replaceAll('\\', '/')
    if (normalized.trim() === '' || normalized.startsWith('/') || normalized.includes('../') || normalized.includes('/..') || normalized.includes('\0')) {
      throw new Error('Project file path must stay relative to its authorized group')
    }
    if (!this.records.has(projectId)) await this.list(projectId, workspacePath)
    const path = safePath(workspacePath, group + '/' + normalized)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
    const records = await this.list(projectId, workspacePath)
    const file = records.find(item => item.group === group && item.relativePath === group + '/' + normalized)
    if (file === undefined) throw new Error('Host-written Project file was not returned by the authorized catalog')
    return file
  }

  /** 关闭此目录持有的文件系统监听器。 */
  dispose(): void {
    this.disposed = true
    for (const watcher of this.watchers.values()) watcher.close()
    this.watchers.clear()
  }

  private async authorizedFile(projectId: string, workspacePath: string, projectFileId: string): Promise<LabProjectFileRecord> {
    const files = await this.list(projectId, workspacePath)
    const file = files.find(item => item.projectFileId === projectFileId)
    if (file === undefined) throw new Error(`Project file "${projectFileId}" is not authorized for project "${projectId}"`)
    return file
  }

  private watchProject(projectId: string, workspacePath: string): void {
    if (this.disposed || this.watchers.has(projectId)) return
    try {
      const watcher = watch(workspacePath, { recursive: true }, () => {
        void this.list(projectId, workspacePath).catch(() => undefined)
      })
      if (this.disposed) watcher.close()
      else this.watchers.set(projectId, watcher)
    } catch {
      // 文件系统不支持监听时仍保留显式刷新能力。
    }
  }
}

async function scanDirectory(path: string, group: ProjectFileGroup, projectId: string, output: Map<string, LabProjectFileRecord>, prefix = ''): Promise<void> {
  let entries: Dirent[]
  try {
    entries = await readdir(path, { withFileTypes: true })
  } catch (error) {
    if (isMissing(error)) return
    throw error
  }
  for (const entry of entries) {
    const relativeName = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    const entryPath = join(path, entry.name)
    if (entry.isDirectory()) {
      await scanDirectory(entryPath, group, projectId, output, relativeName)
      continue
    }
    if (!entry.isFile()) continue
    const info = await stat(entryPath)
    const relativePath = `${group}/${relativeName}`.split(sep).join('/')
    const digest = await digestFile(entryPath)
    const projectFileId = `project-file-${createHash('sha256').update(`${projectId}:${relativePath}`).digest('hex').slice(0, 24)}`
    output.set(relativePath, {
      projectFileId,
      projectId,
      group,
      displayName: basename(entry.name),
      relativePath,
      mediaType: mediaTypeFor(entry.name),
      size: info.size,
      digest,
      revision: 1,
      createdAt: Number.isFinite(info.birthtimeMs) ? Math.trunc(info.birthtimeMs) : Math.trunc(info.mtimeMs),
    })
  }
}

function safePath(workspacePath: string, relativePath: string): string {
  const root = join(workspacePath, sep)
  const candidate = join(workspacePath, relativePath)
  const normalized = relative(root, candidate)
  if (normalized === '' || normalized.startsWith(`..${sep}`) || normalized === '..') throw new Error('Project file path is outside the authorized Workspace')
  return candidate
}

async function digestFile(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return `sha256:${hash.digest('hex')}`
}

function mediaTypeFor(name: string): string {
  switch (extname(name).toLowerCase()) {
    case '.json': return 'application/json'
    case '.md': return 'text/markdown'
    case '.txt': return 'text/plain'
    case '.csv': return 'text/csv'
    case '.yaml':
    case '.yml': return 'text/yaml'
    case '.xml': return 'application/xml'
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.gif': return 'image/gif'
    case '.webp': return 'image/webp'
    default: return 'application/octet-stream'
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { readonly code?: unknown }).code === 'ENOENT'
}
