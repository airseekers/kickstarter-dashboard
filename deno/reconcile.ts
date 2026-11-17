import { markStepFailure, sealHistory } from '../shared/merge.ts'
import { toShanghaiIso } from '../shared/time.ts'
import type { ProjectsFile, SourceId } from '../shared/types.ts'
import { readDataset, writeDataset } from './write.ts'

const outcomes: Record<SourceId, string | undefined> = {
  search: Deno.env.get('SEARCH_OUTCOME') ?? undefined,
  project_json: Deno.env.get('PROJECT_OUTCOME') ?? undefined,
  community: Deno.env.get('COMMUNITY_OUTCOME') ?? undefined,
  faqs: Deno.env.get('FAQS_OUTCOME') ?? undefined,
}

const projects = JSON.parse(await Deno.readTextFile('data/projects.json')) as ProjectsFile
const fetchedAt = Deno.env.get('COLLECTED_AT') || toShanghaiIso(new Date())

for (const project of projects.projects) {
  const before = JSON.stringify(await readDataset(project.key))
  let dataset = JSON.parse(before)
  for (const source of dataset.sources) {
    const outcome = outcomes[source.id as SourceId]
    if (outcome !== 'failure') continue
    dataset = markStepFailure(
      dataset,
      source.id,
      fetchedAt,
      'http_error',
      'Flat 的 HTTP 步骤在后处理之前失败。常见原因是 Cloudflare 403 或非 200。响应体未采纳，原有数字保持不变。',
    )
  }
  dataset = sealHistory(dataset)
  if (JSON.stringify(dataset) !== before) {
    await writeDataset(dataset)
    console.log(`recorded source status for ${project.key}`)
  } else {
    console.log(`no status change for ${project.key}`)
  }
}
