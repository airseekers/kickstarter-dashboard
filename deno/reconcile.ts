import { emptyManifest, planCollectionRecord, type HistoryManifest } from '../shared/history.ts'
import { markStepFailure } from '../shared/merge.ts'
import { toShanghaiIso } from '../shared/time.ts'
import type { ProjectsFile, SourceId } from '../shared/types.ts'
import { readDataset, writeDataset, writeText } from './write.ts'

const outcomeEnv: Record<SourceId, string> = {
  search: 'SEARCH_OUTCOME',
  project_json: 'PROJECT_OUTCOME',
  community: 'COMMUNITY_OUTCOME',
  faqs: 'FAQS_OUTCOME',
}

const projects = JSON.parse(await Deno.readTextFile('data/projects.json')) as ProjectsFile
const fetchedAt = Deno.env.get('COLLECTED_AT') || toShanghaiIso(new Date())
const runId = Deno.env.get('COLLECTION_RUN_ID') || `local-${fetchedAt}`

async function readManifest(key: string, capturedAt: string): Promise<HistoryManifest> {
  const path = `data/${key}/history/manifest.json`
  try {
    return JSON.parse(await Deno.readTextFile(path)) as HistoryManifest
  } catch {
    return emptyManifest(key, capturedAt)
  }
}

for (const project of projects.projects) {
  const before = JSON.stringify(await readDataset(project.key))
  let dataset = JSON.parse(before)
  const prefix = project.key.toUpperCase()
  for (const source of dataset.sources) {
    const outcome = Deno.env.get(`${prefix}_${outcomeEnv[source.id as SourceId]}`) ?? undefined
    if (outcome !== 'failure') continue
    dataset = markStepFailure(
      dataset,
      source.id,
      fetchedAt,
      'http_error',
      'Flat 的 HTTP 步骤在后处理之前失败。常见原因是 Cloudflare 403 或非 200。响应体未采纳，原有数字保持不变。',
    )
  }
  const manifest = await readManifest(project.key, dataset.snapshot.capturedAt)
  const plan = planCollectionRecord({
    dataset,
    runId: `${runId}-${project.key}`,
    attemptedAt: fetchedAt,
    recordedAt: fetchedAt,
    manifest,
  })
  dataset = plan.dataset
  if (!plan.skipped) {
    for (const [relativePath, contents] of Object.entries(plan.files)) {
      if (relativePath.endsWith('/manifest.json')) {
        await writeText(relativePath, contents)
        continue
      }
      try {
        await Deno.stat(relativePath)
        console.log(`keep existing history file ${relativePath}`)
      } catch {
        await writeText(relativePath, contents)
      }
    }
  }
  if (JSON.stringify(dataset) !== before) {
    await writeDataset(dataset)
    console.log(`recorded source status for ${project.key}`)
  } else {
    console.log(`no status change for ${project.key}`)
  }
}
