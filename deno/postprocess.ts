import { applyAttempt } from '../shared/merge.ts'
import { parseDownload } from '../shared/parse.ts'
import { assertNoSignedUrls } from '../shared/sanitize.ts'
import { toShanghaiIso } from '../shared/time.ts'
import type { ProjectConfig, ProjectsFile, SourceId } from '../shared/types.ts'
import { readDataset, restoreOrRemove, writeDataset, writeText } from './write.ts'

const FILE_SOURCES: Record<string, SourceId> = {
  'search.json': 'search',
  'project.json': 'project_json',
  'community.json': 'community',
  'faqs.json': 'faqs',
}

export async function processDownload(filename: string): Promise<'accepted' | 'rejected'> {
  const match = filename.match(/data\/raw\/([^/]+)\/([^/]+)$/)
  if (!match) {
    console.error(`Unexpected download path: ${filename}`)
    return 'rejected'
  }
  const [, projectKey, baseName] = match
  const source = FILE_SOURCES[baseName]
  if (!source) {
    console.error(`Unknown download: ${baseName}`)
    return 'rejected'
  }
  const projects = JSON.parse(await Deno.readTextFile('data/projects.json')) as ProjectsFile
  const project = projects.projects.find((item) => item.key === projectKey) as ProjectConfig | undefined
  if (!project) {
    console.error(`No project config for ${projectKey}`)
    return 'rejected'
  }
  const fetchedAt = Deno.env.get('COLLECTED_AT') || toShanghaiIso(new Date())
  try {
    const raw = await Deno.readTextFile(filename)
    const result = parseDownload(source, raw, project)
    const dataset = await readDataset(projectKey)
    if (!result.ok) {
      await restoreOrRemove(filename)
      await writeDataset(applyAttempt(dataset, { source, result, fetchedAt, httpStatus: null }))
      console.log(`${source} rejected: ${result.status} ${result.error}`)
      return 'rejected'
    }
    assertNoSignedUrls(result.sanitizedRaw)
    const next = applyAttempt(dataset, { source, result, fetchedAt, httpStatus: 200 })
    if (next.sources.find((item) => item.id === source)?.status !== 'ok') {
      await restoreOrRemove(filename)
      await writeDataset(next)
      console.log(`${source} rejected after validation`)
      return 'rejected'
    }
    await writeText(filename, `${JSON.stringify(result.sanitizedRaw, null, 2)}\n`)
    await writeDataset(next)
    console.log(`${source} accepted for ${project.slug}`)
    return 'accepted'
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    await restoreOrRemove(filename)
    return 'rejected'
  }
}

if (import.meta.main) {
  const filename = Deno.args[0]
  if (!filename) {
    console.error('Missing downloaded filename.')
    Deno.exit(0)
  }
  await processDownload(filename)
}
