import { keepLastQuote, parseFrankfurter, type FxQuote } from '../shared/fx-types.ts'
import { toShanghaiIso } from '../shared/time.ts'
import { writeText } from './write.ts'

const latestPath = 'data/fx/latest.json'
const downloaded = Deno.args[0]
const attemptedAt = Deno.env.get('COLLECTED_AT') || toShanghaiIso(new Date())

async function readLatest(): Promise<FxQuote | null> {
  try {
    return JSON.parse(await Deno.readTextFile(latestPath)) as FxQuote
  } catch {
    return null
  }
}

const previous = await readLatest()
let raw = ''
try {
  raw = downloaded ? await Deno.readTextFile(downloaded) : ''
} catch {
  raw = ''
}
const parsed = parseFrankfurter(raw, attemptedAt)
if (!('rates' in parsed)) {
  if (previous) {
    await writeText(latestPath, `${JSON.stringify(keepLastQuote(previous, parsed.error, attemptedAt), null, 2)}\n`)
  }
  console.error(parsed.error)
  Deno.exit(0)
}
await writeText(latestPath, `${JSON.stringify(parsed, null, 2)}\n`)
console.log(`fx accepted ${parsed.rateDate}`)
