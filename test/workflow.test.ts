import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TRON_PROJECT } from '../shared/seed.ts'

const flat = readFileSync(new URL('../.github/workflows/flat.yml', import.meta.url), 'utf8')
const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

describe('actions configuration', () => {
  it('schedules Flat Data at 02:00 UTC and pins the real flat action', () => {
    expect(flat).toContain("cron: '0 2 * * *'")
    expect(flat).toContain('workflow_dispatch:')
    expect(flat).toContain('githubocto/flat@cea5ee43fce40ef71501bf5724a00d45db11641d')
    expect(flat).toContain('denoland/setup-deno@667a34cdef165d8d2b2e98dde39547c9daac7282')
    expect(flat).toContain('deno-version: 1.46.3')
    expect(flat).toContain('postprocess: deno/postprocess.ts')
    expect(flat).not.toContain('[skip ci]')
    expect(flat).toContain("github.repository == 'airseekers/kickstarter-dashboard'")
    for (const url of Object.values(TRON_PROJECT.sources)) {
      expect(flat).toContain(url)
    }
  })

  it('deploys from the collection workflow and keeps fork builds read-only', () => {
    expect(flat).toContain('actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9')
    expect(flat).toContain('actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346')
    expect(ci).toContain('pull_request:')
    expect(ci).toContain('persist-credentials: false')
    expect(ci).toContain("github.event_name != 'pull_request'")
    expect(ci).not.toContain('contents: write')
    expect(vite).toContain("'/kickstarter-dashboard/'")
  })
})
