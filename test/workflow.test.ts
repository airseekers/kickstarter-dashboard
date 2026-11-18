import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARANIX_PROJECT } from '../shared/aranix.ts'
import { TRON_PROJECT } from '../shared/seed.ts'

const flat = readFileSync(new URL('../.github/workflows/flat.yml', import.meta.url), 'utf8')
const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

describe('actions configuration', () => {
  it('schedules ARANIX hourly and fetches through the worker or a direct request', () => {
    expect(flat).toContain("cron: '17 * * * *'")
    expect(flat).not.toContain("cron: '0 2 * * *'")
    expect(flat).toContain('steps.targets.outputs.tron')
    expect(flat).toContain('workflow_dispatch:')
    expect(flat).not.toContain('githubocto/flat')
    expect(flat).toContain('denoland/setup-deno@667a34cdef165d8d2b2e98dde39547c9daac7282')
    expect(flat).toContain('deno-version: 1.46.3')
    expect(flat).toContain('deno run --allow-env --allow-net --allow-read --allow-write --allow-run=git deno/collect.ts')
    expect(flat).not.toContain('[skip ci]')
    expect(flat).not.toContain('[CF-Pages-Skip]')
    expect(flat).toContain('vars.KICKSTARTER_FETCH_BASE')
    expect(flat).toContain("github.repository == 'airseekers/kickstarter-dashboard'")
    for (const url of [...Object.values(TRON_PROJECT.sources), ...Object.values(ARANIX_PROJECT.sources)]) {
      expect(readFileSync(new URL('../data/projects.json', import.meta.url), 'utf8')).toContain(url)
    }
  })

  it('deploys only after a material commit is on main', () => {
    const pushAt = flat.indexOf('git push origin HEAD')
    const uploadAt = flat.indexOf('actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9')
    expect(pushAt).toBeGreaterThan(0)
    expect(uploadAt).toBeGreaterThan(pushAt)
    expect(flat).toContain("needs.collect.outputs.pushed == 'true'")
    expect(flat).toContain('actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346')
    expect(flat).toContain('origin/main')
    expect(ci).toContain('pull_request:')
    expect(ci).toContain('persist-credentials: false')
    expect(ci).toContain("github.event_name != 'pull_request'")
    expect(ci).not.toContain('contents: write')
    expect(vite).toContain('resolveViteBase(process.env.VITE_BASE)')
    expect(readFileSync(new URL('../shared/base.ts', import.meta.url), 'utf8')).toContain("'/kickstarter-dashboard/'")
  })
})
