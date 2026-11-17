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

function fail(message: string): never {
  console.error(message)
  Deno.exit(0)
}

const filename = Deno.args[0]
if (!filename) fail('Flat did not pass a downloaded filename.')

const match = filename.match(/data\/raw\/([^/]+)\/([^/]+)$/)
if (!match) fail(`Unexpected download path: ${filename}`)
const [, projectKey, baseName] = match
const source = FILE_SOURCES[baseName]
if (!source) fail(`Unknown Flat download: ${baseName}`)

const projects = JSON.parse(await Deno.readTextFile('data/projects.json')) as ProjectsFile
const project = projects.projects.find((item) => item.key === projectKey) as ProjectConfig | undefined
if (!project) fail(`No project config for ${projectKey}`)

const fetchedAt = Deno.env.get('COLLECTED_AT') || toShanghaiIso(new Date())

try {
  const raw = await Deno.readTextFile(filename)
  const result = parseDownload(source, raw, project)
  const dataset = await readDataset(projectKey)
  if (!result.ok) {
    await restoreOrRemove(filename)
    await writeDataset(applyAttempt(dataset, { source, result, fetchedAt, httpStatus: null }))
    console.log(`${source} rejected: ${result.status} ${result.error}`)
    Deno.exit(0)
  }
  assertNoSignedUrls(result.sanitizedRaw)
  const next = applyAttempt(dataset, { source, result, fetchedAt, httpStatus: 200 })
  if (next.sources.find((item) => item.id === source)?.status !== 'ok') {
    await restoreOrRemove(filename)
    await writeDataset(next)
    console.log(`${source} rejected after validation`)
    Deno.exit(0)
  }
  await writeText(filename, `${JSON.stringify(result.sanitizedRaw, null, 2)}\n`)
  await writeDataset(next)
  console.log(`${source} accepted for ${project.slug}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  await restoreOrRemove(filename)
  Deno.exit(0)
}
