import { classifyResponse, followupAttempt, initialAttempt, type FetchAttempt } from '../shared/fetch-route.ts'
import { toShanghaiIso } from '../shared/time.ts'
import type { ProjectsFile, SourceId } from '../shared/types.ts'
import { processFx } from './fx-postprocess.ts'
import { processDownload } from './postprocess.ts'
import { reconcile } from './reconcile.ts'
import { writeText } from './write.ts'

const HEADERS = {
  Accept: 'application/json, text/html;q=0.8, */*;q=0.5',
  'Accept-Language': 'en',
  'User-Agent':
    'airseekers-kickstarter-dashboard/1.0 (third-party public dataset; https://github.com/airseekers/kickstarter-dashboard)',
}

const SOURCE_FILES: Record<SourceId, string> = {
  search: 'search.json',
  project_json: 'project.json',
  community: 'community.json',
  faqs: 'faqs.json',
}

const OUTCOME_ENV: Record<SourceId, string> = {
  search: 'SEARCH_OUTCOME',
  project_json: 'PROJECT_OUTCOME',
  community: 'COMMUNITY_OUTCOME',
  faqs: 'FAQS_OUTCOME',
}

function selected(key: string): boolean {
  return Deno.env.get(key.toUpperCase()) === 'true'
}

async function requestOnce(attempt: FetchAttempt): Promise<{ status: number; body: string }> {
  const response = await fetch(attempt.url, {
    method: 'GET',
    redirect: 'manual',
    headers: HEADERS,
    signal: AbortSignal.timeout(25_000),
  })
  return { status: response.status, body: await response.text() }
}

async function fetchPublic(target: string, base: string | undefined): Promise<{ ok: boolean; body: string; status: number }> {
  let attempt = initialAttempt(base, target)
  let retriesUsed = 0
  for (let hop = 0; hop < 4; hop += 1) {
    let status = 0
    let body = ''
    try {
      const response = await requestOnce(attempt)
      status = response.status
      body = response.body
    } catch (error) {
      console.error(`${attempt.via} ${target} ${error instanceof Error ? error.message : String(error)}`)
      status = 0
    }
    const outcome = status === 0 ? 'retry' : classifyResponse(status, body)
    console.log(`${attempt.via} ${status} ${target}`)
    if (outcome === 'ok') return { ok: true, body, status }
    const next = followupAttempt(attempt, outcome, target, retriesUsed)
    if (outcome === 'retry' && next?.url === attempt.url) retriesUsed += 1
    if (!next) return { ok: false, body, status }
    if (outcome === 'retry') await new Promise((resolve) => setTimeout(resolve, 1_000))
    attempt = next
  }
  return { ok: false, body: '', status: 0 }
}

const fetchedAt = Deno.env.get('COLLECTED_AT') || toShanghaiIso(new Date())
Deno.env.set('COLLECTED_AT', fetchedAt)
const proxy = Deno.env.get('KICKSTARTER_FETCH_BASE')
const projects = JSON.parse(await Deno.readTextFile('data/projects.json')) as ProjectsFile

const fxDownload = await Deno.makeTempFile({ prefix: 'frankfurter-', suffix: '.tmp' })
const fx = await fetchPublic('https://api.frankfurter.app/latest?from=HKD&to=USD,CNY', undefined)
if (fx.ok) {
  await Deno.writeTextFile(fxDownload, fx.body)
  await processFx(fxDownload)
} else {
  console.error(`fx http ${fx.status}; previous quote kept`)
}

for (const project of projects.projects) {
  if (!selected(project.key)) continue
  const prefix = project.key.toUpperCase()
  for (const source of Object.keys(SOURCE_FILES) as SourceId[]) {
    const target = project.sources[source]
    const result = await fetchPublic(target, proxy)
    const envName = `${prefix}_${OUTCOME_ENV[source]}`
    if (!result.ok) {
      Deno.env.set(envName, 'failure')
      console.error(`${project.key} ${source} not stored`)
      continue
    }
    const filename = `data/raw/${project.key}/${SOURCE_FILES[source]}`
    await writeText(filename, result.body.endsWith('\n') ? result.body : `${result.body}\n`)
    const processed = await processDownload(filename)
    Deno.env.set(envName, processed === 'accepted' ? 'success' : 'failure')
  }
}

await reconcile()
