import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { classifyResponse, followupAttempt, initialAttempt, workerFetchUrl } from '../shared/fetch-route.ts'
import { fxRatesChanged, porcelainPaths, shouldPublish } from '../shared/publish.ts'
import { inspectRepository } from '../scripts/decide-publish.ts'
import { ARANIX_PROJECT } from '../shared/aranix.ts'
import { TRON_PROJECT } from '../shared/seed.ts'
import { isAllowedKickstarterUrl as workerAllow } from '../workers/kickstarter-fetch/src/allowlist.js'

const quote = `{
  "rateDate": "2026-11-16",
  "rates": { "USD": 0.12744, "CNY": 0.84956 }
}`

describe('publish decision', () => {
  it('publishes an accepted observation and a real rate change, not a failure-only tree', () => {
    expect(shouldPublish({ changedPaths: [], fxRatesChanged: false })).toEqual({
      publish: false,
      reason: 'no_file_changes',
    })
    expect(
      shouldPublish({
        changedPaths: ['data/aranix/history/attempts/2026/11/fail.json', 'data/aranix/latest.json'],
        fxRatesChanged: false,
      }),
    ).toEqual({ publish: false, reason: 'no_material_update' })
    expect(
      shouldPublish({
        changedPaths: ['data/aranix/history/observations/2026/11/ok.json'],
        fxRatesChanged: false,
      }).publish,
    ).toBe(true)
    expect(shouldPublish({ changedPaths: ['data/fx/latest.json'], fxRatesChanged: true }).reason).toBe('fx_rates_changed')
  })

  it('ignores a retrievedAt-only rewrite and same-length rate bytes that actually changed', () => {
    const stamped = quote.replace('2026-11-16', '2026-11-16').replace('0.12744', '0.12744')
    expect(fxRatesChanged(quote, stamped.replace('"rateDate"', '"retrievedAt": "later", "rateDate"'))).toBe(false)
    const sameLength = quote.replace('2026-11-16', '2026-11-17').replace('0.12744', '0.12745').replace('0.84956', '0.84961')
    expect(Buffer.byteLength(quote)).toBe(Buffer.byteLength(sameLength))
    expect(fxRatesChanged(quote, sameLength)).toBe(true)
    expect(fxRatesChanged(quote, quote)).toBe(false)
  })

  it('reads git paths and a real worktree', async () => {
    expect(porcelainPaths('?? data/aranix/history/observations/2026/11/a.json\n M data/fx/latest.json\n')).toEqual([
      'data/aranix/history/observations/2026/11/a.json',
      'data/fx/latest.json',
    ])
    const root = await mkdtemp(path.join(tmpdir(), 'publish-'))
    const run = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    try {
      run(['init'])
      run(['config', 'user.email', 'test@example.com'])
      run(['config', 'user.name', 'test'])
      await mkdir(path.join(root, 'data/fx'), { recursive: true })
      await writeFile(path.join(root, 'data/fx/latest.json'), `${quote}\n`)
      run(['add', 'data'])
      run(['commit', '-m', 'seed'])
      await writeFile(path.join(root, 'data/fx/latest.json'), `${quote.replace('2026-11-16', '2026-11-17')}\n`)
      expect(inspectRepository(root)).toEqual({ publish: true, reason: 'fx_rates_changed' })
      await writeFile(path.join(root, 'data/fx/latest.json'), `${quote}\n`)
      await mkdir(path.join(root, 'data/aranix/history/attempts/2026/11'), { recursive: true })
      await writeFile(path.join(root, 'data/aranix/history/attempts/2026/11/fail.json'), '{}\n')
      expect(inspectRepository(root).publish).toBe(false)
      await mkdir(path.join(root, 'data/aranix/history/observations/2026/11'), { recursive: true })
      await writeFile(path.join(root, 'data/aranix/history/observations/2026/11/ok.json'), '{}\n')
      expect(inspectRepository(root).publish).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('public fetch route', () => {
  it('allowlists only the two projects and does not retry a 403', async () => {
    const urls = [...Object.values(ARANIX_PROJECT.sources), ...Object.values(TRON_PROJECT.sources)]
    for (const url of urls) expect(workerAllow(url)).toBe(true)
    expect(workerAllow('https://www.kickstarter.com/projects/search.json?term=ARANIX&extra=1')).toBe(false)
    expect(workerAllow('https://example.com/projects/search.json?term=ARANIX')).toBe(false)
    expect(workerAllow('http://www.kickstarter.com/projects/search.json?term=ARANIX')).toBe(false)
    expect(classifyResponse(403, 'blocked')).toBe('fail')
    expect(classifyResponse(200, '<html>Just a moment</html>')).toBe('fail')
    expect(classifyResponse(503, '')).toBe('retry')
    const worker = initialAttempt('https://fetch.example.workers.dev', urls[0])
    expect(worker.url).toBe(workerFetchUrl('https://fetch.example.workers.dev/', urls[0]))
    expect(followupAttempt(worker, 'fail', urls[0], 0)?.via).toBe('direct')
    expect(followupAttempt({ via: 'direct', url: urls[0] }, 'fail', urls[0], 0)).toBeNull()
    const source = await readFile(new URL('../workers/kickstarter-fetch/src/index.js', import.meta.url), 'utf8')
    expect(source).not.toContain('cf_clearance')
    expect(source).toContain("redirect: 'manual'")
  })
})
