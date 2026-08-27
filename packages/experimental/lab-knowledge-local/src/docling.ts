import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import type { DocumentParser, ParsedDocumentBlock } from './index.ts'

/** Docling 适配器可观察的稳定错误码。 */
export type DoclingParserErrorCode =
  | 'PDF_INPUT_INVALID'
  | 'PDF_INPUT_TOO_LARGE'
  | 'DOCLING_RUNTIME_UNAVAILABLE'
  | 'DOCLING_TIMEOUT'
  | 'DOCLING_PROCESS_FAILED'
  | 'DOCLING_OUTPUT_INVALID'
  | 'DOCLING_NO_TEXT'

/** Docling 适配器报告错误时所处的处理阶段。 */
export type DoclingParserErrorPhase = 'input' | 'process' | 'output'

/** 带有稳定错误码、阶段和可重试标记的文档解析异常。 */
export class DoclingParserError extends Error {
  readonly code: DoclingParserErrorCode
  readonly phase: DoclingParserErrorPhase
  readonly retryable: boolean

  constructor(code: DoclingParserErrorCode, phase: DoclingParserErrorPhase, retryable: boolean, detail?: string) {
    super(`${code}${detail === undefined ? '' : `: ${detail}`}`)
    this.name = 'DoclingParserError'
    this.code = code
    this.phase = phase
    this.retryable = retryable
  }
}

/** Docling 进程标准化后的区块。Python runner 负责把原生 Docling 文档转换为此协议。 */
export interface DoclingRunnerBlock {
  readonly kind: 'heading' | 'text' | 'table'
  readonly location: string
  readonly content: string
  readonly page?: number
  readonly level?: number
  readonly titlePath?: readonly string[]
  readonly tableHeaders?: readonly string[]
  readonly tableRow?: number
}

/** Python runner 输出的有版本 JSON 协议。 */
export interface DoclingRunnerOutput {
  readonly schemaVersion: 1
  readonly parser: { readonly name: 'docling'; readonly version: string }
  readonly blocks: readonly DoclingRunnerBlock[]
}

/** 交给受控本地进程执行器的请求。 */
export interface DoclingProcessRequest {
  readonly argv: readonly string[]
  readonly cwd: string
  readonly inputPath: string
  readonly timeoutMs: number
  readonly maxOutputBytes: number
}

/** 受控本地进程执行器的结果。 */
export interface DoclingProcessResult {
  readonly exitCode: number | null
  readonly stdout: string
  readonly stderr: string
}

/** 可替换的进程执行接缝，测试和 Host 实现共用。 */
export interface DoclingProcessRunner {
  run(request: DoclingProcessRequest): Promise<DoclingProcessResult>
}

/** Docling Adapter 配置；runnerPath 和 pythonCommand 只接受受信任部署配置。 */
export interface DoclingAdapterConfig {
  readonly runner: DoclingProcessRunner
  readonly pythonCommand?: string
  readonly runnerPath?: string
  readonly timeoutMs?: number
  readonly maxInputBytes?: number
  readonly maxOutputBytes?: number
}

/** 可由实验 bundle 传入的受信任 Docling 运行时配置。 */
export type DoclingConfig = Omit<DoclingAdapterConfig, 'runner'>

/** 从已挂载的 Host subprocess 服务创建本地 Docling Adapter。 */
export function createDoclingAdapter(ctx: Context, config: DoclingConfig = {}): DoclingAdapter {
  const subprocess = ctx.get('subprocess') as SubprocessRuntime | undefined
  if (subprocess === undefined) throw new DoclingParserError('DOCLING_RUNTIME_UNAVAILABLE', 'process', false, 'subprocess service is not mounted')
  return new DoclingAdapter({ ...config, runner: new SubprocessDoclingProcessRunner(subprocess) })
}

/** 在 Host subprocess 服务上执行 Docling Python runner。 */
export class SubprocessDoclingProcessRunner implements DoclingProcessRunner {
  constructor(private readonly subprocess: SubprocessRuntime) {}

  async run(request: DoclingProcessRequest): Promise<DoclingProcessResult> {
    const command = request.argv[0]
    if (command === undefined) throw new DoclingParserError('DOCLING_RUNTIME_UNAVAILABLE', 'process', false, 'python command is empty')
    let executable: string
    try {
      executable = await this.subprocess.resolveExecutable(command)
    } catch (error) {
      throw new DoclingParserError('DOCLING_RUNTIME_UNAVAILABLE', 'process', false, error instanceof Error ? error.message : String(error))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs)
    let handle
    try {
      handle = this.subprocess.spawn({
        argv: [executable, ...request.argv.slice(1)],
        cwd: request.cwd,
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: request.maxOutputBytes },
          stderr: { maxBytes: request.maxOutputBytes },
        },
        graceMs: 1_000,
        signal: controller.signal,
      })
      const outcome = await handle.done
      if (controller.signal.aborted) throw new DoclingParserError('DOCLING_TIMEOUT', 'process', true, `exceeded ${request.timeoutMs}ms`)
      return {
        exitCode: outcome.exitCode,
        stdout: handle.collected.stdout?.readFrom(0).text ?? '',
        stderr: handle.collected.stderr?.readFrom(0).text ?? '',
      }
    } catch (error) {
      if (error instanceof DoclingParserError) throw error
      throw new DoclingParserError('DOCLING_PROCESS_FAILED', 'process', false, error instanceof Error ? error.message : String(error))
    } finally {
      clearTimeout(timeout)
    }
  }
}

/** 通过本地 Python/Docling runner 把 PDF 转成知识库标准区块。 */
export class DoclingAdapter implements DocumentParser {
  readonly name = 'docling'
  private readonly runner: DoclingProcessRunner
  private readonly pythonCommand: string
  private readonly runnerPath: string
  private readonly timeoutMs: number
  private readonly maxInputBytes: number
  private readonly maxOutputBytes: number

  constructor(config: DoclingAdapterConfig) {
    this.runner = config.runner
    this.pythonCommand = config.pythonCommand ?? process.env.DOCLING_PYTHON ?? 'python3'
    this.runnerPath = config.runnerPath ?? fileURLToPath(new URL('../runtime/docling_runner.py', import.meta.url))
    this.timeoutMs = config.timeoutMs ?? 600_000
    this.maxInputBytes = config.maxInputBytes ?? 100 * 1024 * 1024
    this.maxOutputBytes = config.maxOutputBytes ?? 8 * 1024 * 1024
    if (this.pythonCommand.trim().length === 0) throw new Error('docling pythonCommand must be non-empty')
    if (this.runnerPath.trim().length === 0) throw new Error('docling runnerPath must be non-empty')
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs <= 0) throw new Error('docling timeoutMs must be a positive integer')
    if (!Number.isInteger(this.maxInputBytes) || this.maxInputBytes <= 0) throw new Error('docling maxInputBytes must be a positive integer')
    if (!Number.isInteger(this.maxOutputBytes) || this.maxOutputBytes <= 0) throw new Error('docling maxOutputBytes must be a positive integer')
  }

  supports(name: string): boolean {
    return name.toLowerCase().endsWith('.pdf')
  }

  async parse(input: { readonly name: string; readonly bytes: Iterable<number> }): Promise<readonly ParsedDocumentBlock[]> {
    const bytes = Uint8Array.from(input.bytes)
    if (bytes.byteLength > this.maxInputBytes) throw new DoclingParserError('PDF_INPUT_TOO_LARGE', 'input', false, `${bytes.byteLength} bytes exceeds ${this.maxInputBytes}`)
    if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') {
      throw new DoclingParserError('PDF_INPUT_INVALID', 'input', false, 'missing PDF signature')
    }

    const workDir = await mkdtemp(join(tmpdir(), 'dsh-docling-'))
    const inputPath = join(workDir, 'input.pdf')
    try {
      await writeFile(inputPath, bytes, { mode: 0o600 })
      const result = await this.runner.run({
        argv: [this.pythonCommand, this.runnerPath, inputPath],
        cwd: workDir,
        inputPath,
        timeoutMs: this.timeoutMs,
        maxOutputBytes: this.maxOutputBytes,
      })
      if (result.exitCode !== 0) throw new DoclingParserError('DOCLING_PROCESS_FAILED', 'process', false, result.stderr.trim() || `exit code ${String(result.exitCode)}`)
      return this.convertOutput(result.stdout)
    } catch (error) {
      if (error instanceof DoclingParserError) throw error
      throw new DoclingParserError('DOCLING_PROCESS_FAILED', 'process', false, error instanceof Error ? error.message : String(error))
    } finally {
      await rm(workDir, { recursive: true, force: true })
    }
  }

  private convertOutput(stdout: string): readonly ParsedDocumentBlock[] {
    let value: unknown
    try {
      value = JSON.parse(stdout)
    } catch (error) {
      throw new DoclingParserError('DOCLING_OUTPUT_INVALID', 'output', false, error instanceof Error ? error.message : String(error))
    }
    if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.parser) || value.parser.name !== 'docling' || typeof value.parser.version !== 'string' || !Array.isArray(value.blocks)) {
      throw new DoclingParserError('DOCLING_OUTPUT_INVALID', 'output', false, 'runner output does not match schemaVersion 1')
    }

    const headings: string[] = []
    const blocks: ParsedDocumentBlock[] = []
    for (const [index, candidate] of value.blocks.entries()) {
      if (!isRecord(candidate) || !isRunnerKind(candidate.kind) || typeof candidate.location !== 'string' || candidate.location.trim().length === 0 || typeof candidate.content !== 'string') {
        throw new DoclingParserError('DOCLING_OUTPUT_INVALID', 'output', false, `invalid block at index ${index}`)
      }
      const content = candidate.content.trim()
      if (content.length === 0) continue
      if (candidate.kind === 'heading') {
        const rawLevel = candidate.level
        const level = rawLevel === undefined ? 1 : rawLevel
        if (typeof level !== 'number' || !Number.isInteger(level) || level < 1) throw new DoclingParserError('DOCLING_OUTPUT_INVALID', 'output', false, `invalid heading level at index ${index}`)
        headings.splice(level - 1)
        headings.push(content)
        blocks.push({ ...commonBlock(candidate, content), kind: 'text', titlePath: [...headings] })
        continue
      }
      const rawTitlePath = candidate.titlePath
      const titlePath = rawTitlePath === undefined ? (headings.length === 0 ? undefined : [...headings]) : rawTitlePath
      if (titlePath !== undefined && (!Array.isArray(titlePath) || titlePath.some(title => typeof title !== 'string'))) {
        throw new DoclingParserError('DOCLING_OUTPUT_INVALID', 'output', false, `invalid title path at index ${index}`)
      }
      const validTitlePath = titlePath as readonly string[] | undefined
      if (candidate.kind === 'table') {
        const tableHeaders = candidate.tableHeaders
        if (!Array.isArray(tableHeaders) || tableHeaders.length === 0 || tableHeaders.some(header => typeof header !== 'string' || header.trim().length === 0)) {
          throw new DoclingParserError('DOCLING_OUTPUT_INVALID', 'output', false, `table headers are missing at index ${index}`)
        }
        const tableRow = candidate.tableRow
        if (tableRow !== undefined && (typeof tableRow !== 'number' || !Number.isInteger(tableRow) || tableRow < 1)) {
          throw new DoclingParserError('DOCLING_OUTPUT_INVALID', 'output', false, `invalid table row at index ${index}`)
        }
        blocks.push({ ...commonBlock(candidate, content), kind: 'table', ...validTitlePath === undefined ? {} : { titlePath: validTitlePath }, tableHeaders: tableHeaders as readonly string[], ...tableRow === undefined ? {} : { tableRow: tableRow as number } })
      } else {
        blocks.push({ ...commonBlock(candidate, content), kind: 'text', ...validTitlePath === undefined ? {} : { titlePath: validTitlePath } })
      }
    }
    if (blocks.length === 0) throw new DoclingParserError('DOCLING_NO_TEXT', 'output', false, 'runner returned no usable blocks')
    return blocks
  }
}

function commonBlock(candidate: Record<string, unknown>, content: string): Omit<ParsedDocumentBlock, 'kind'> {
  const page = candidate.page
  if (page !== undefined && (typeof page !== 'number' || !Number.isInteger(page) || page < 1)) throw new DoclingParserError('DOCLING_OUTPUT_INVALID', 'output', false, 'page must be a positive integer')
  return {
    location: (candidate.location as string).trim(),
    content,
    ...page === undefined ? {} : { page },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRunnerKind(value: unknown): value is DoclingRunnerBlock['kind'] {
  return value === 'heading' || value === 'text' || value === 'table'
}
