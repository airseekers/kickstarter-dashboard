import { fxRatesChanged } from '../shared/publish.ts'
import { parseFrankfurter } from '../shared/fx-types.ts'
import { toShanghaiIso } from '../shared/time.ts'
import { writeText } from './write.ts'

const latestPath = 'data/fx/latest.json'
const rawPath = 'data/fx/frankfurter.json'

export async function processFx(downloaded: string): Promise<'updated' | 'unchanged' | 'kept'> {
  const attemptedAt = Deno.env.get('COLLECTED_AT') || toShanghaiIso(new Date())
  let previous = ''
  try {
    previous = await Deno.readTextFile(latestPath)
  } catch {
    previous = ''
  }
  let raw = ''
  try {
    raw = downloaded ? await Deno.readTextFile(downloaded) : ''
  } catch {
    raw = ''
  }
  const parsed = parseFrankfurter(raw, attemptedAt)
  if (!('rates' in parsed)) {
    console.error(parsed.error)
    return 'kept'
  }
  const next = `${JSON.stringify(parsed, null, 2)}\n`
  if (previous && !fxRatesChanged(previous, next)) {
    console.log(`fx unchanged ${parsed.rateDate}`)
    return 'unchanged'
  }
  await writeText(rawPath, raw.endsWith('\n') ? raw : `${raw}\n`)
  await writeText(latestPath, next)
  console.log(`fx accepted ${parsed.rateDate}`)
  return 'updated'
}

if (import.meta.main) {
  const downloaded = Deno.args[0]
  if (!downloaded) {
    console.error('Missing Frankfurter download.')
    Deno.exit(0)
  }
  await processFx(downloaded)
}
