import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { LabProjectFileCatalog } from '../src/project-files.ts'

describe('LabProjectFileCatalog', () => {
  it('只暴露固定 Project 目录，并为预览、下载和 revision 提供 Host 授权', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-lab-project-files-'))
    const events: unknown[] = []
    const catalog = new LabProjectFileCatalog(event => { events.push(event) })
    try {
      await mkdir(join(root, 'configuration'), { recursive: true })
      await mkdir(join(root, 'conversation-output'), { recursive: true })
      await mkdir(join(root, 'run-artifacts'), { recursive: true })
      await writeFile(join(root, 'configuration', 'workflow.json'), '{"revision":1}\n', 'utf8')
      await writeFile(join(root, 'outside.txt'), 'not authorized', 'utf8')

      const first = await catalog.list('project-1', root)
      expect(first).toHaveLength(1)
      expect(first[0]).toMatchObject({ group: 'configuration', relativePath: 'configuration/workflow.json', revision: 1, mediaType: 'application/json' })
      const file = first[0]
      if (file === undefined) throw new Error('expected a project file')
      await expect(catalog.open('project-1', root, file.projectFileId)).resolves.toMatchObject({ kind: 'json', content: { revision: 1 } })
      await expect(catalog.download('project-1', root, file.projectFileId)).resolves.toMatchObject({ projectFileId: file.projectFileId, displayName: 'workflow.json', mediaType: 'application/json' })
      await expect(catalog.open('project-1', root, 'project-file-unknown')).rejects.toThrow(/not authorized/)

      await writeFile(join(root, 'configuration', 'workflow.json'), '{"revision":2}\n', 'utf8')
      const second = await catalog.list('project-1', root)
      expect(second[0]).toMatchObject({ revision: 2 })
      expect(events).toContainEqual(expect.objectContaining({ type: 'project-file-revision', projectId: 'project-1', revision: 2 }))
    } finally {
      catalog.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })
})
