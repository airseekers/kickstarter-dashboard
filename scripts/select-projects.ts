import { appendFileSync } from 'node:fs'
import { projectsForTrigger } from '../shared/schedule.ts'

const projects = projectsForTrigger({
  name: process.env.EVENT_NAME === 'schedule' ? 'schedule' : 'workflow_dispatch',
  schedule: process.env.EVENT_SCHEDULE ?? '',
  input: process.env.INPUT_PROJECT || 'aranix',
  utcHour: Number(process.env.UTC_HOUR ?? new Date().getUTCHours()),
})
const output = process.env.GITHUB_OUTPUT
const body = `aranix=${projects.includes('aranix')}\ntron=${projects.includes('tron')}\n`
if (output) appendFileSync(output, body)
else process.stdout.write(body)
