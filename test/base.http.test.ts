import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveViteBase } from '../shared/base.ts'

function runBuild(base: string | undefined, outDir: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('npx', ['vite', 'build', '--outDir', outDir], {
      env: { ...process.env, NODE_ENV: 'production', VITE_BASE: base ?? '' },
      stdio: 'inherit',
    })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build ${base} exited ${code}`))))
  })
}

function serve(root: string, mount = '') {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve, reject) => {
    const server = createServer(async (request, response) => {
      const { readFile } = await import('node:fs/promises')
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      const pathname = decodeURIComponent(url.pathname)
      const relative = mount && (pathname === mount || pathname.startsWith(`${mount}/`))
        ? pathname.slice(mount.length) || '/'
        : pathname
      const candidates = [relative, `${relative}.html`, path.posix.join(relative, 'index.html')]
      for (const candidate of candidates) {
        const file = path.join(root, candidate.replace(/^\/+/, ''))
        try {
          const body = await readFile(file)
          const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'
          response.writeHead(200, { 'content-type': type })
          response.end(body)
          return
        } catch {
          // try the next candidate
        }
      }
      response.writeHead(404)
      response.end('missing')
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('port'))
        return
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done())),
      })
    })
  })
}

async function expectSite(origin: string, prefix: string) {
  const root = await fetch(`${origin}${prefix || '/'}`)
  const rootHtml = await root.text()
  expect(root.status).toBe(200)
  expect(rootHtml).toContain('data-project="ARANIX"')
  const aranix = await fetch(`${origin}${prefix}/ARANIX/`)
  expect(await aranix.text()).toContain('data-project="ARANIX"')
  const tron = await fetch(`${origin}${prefix}/TRON/`)
  expect(await tron.text()).toContain('data-project="TRON"')
  const bareAranix = await fetch(`${origin}${prefix}/ARANIX`)
  expect(await bareAranix.text()).toContain('data-project="ARANIX"')
  const bareTron = await fetch(`${origin}${prefix}/TRON`)
  expect(await bareTron.text()).toContain('data-project="TRON"')
  const html = await (await fetch(`${origin}${prefix}/TRON/`)).text()
  const asset = html.match(/src="([^"]+\.js)"/)?.[1]
  expect(asset?.startsWith(`${prefix || ''}/assets/`)).toBe(true)
  const assetUrl = new URL(asset!, origin).href
  const assetBody = await (await fetch(assetUrl)).text()
  const expectedBase = prefix ? '/kickstarter-dashboard/' : '/'
  expect(assetBody).toContain(`BASE_URL:\`${expectedBase}\``)
  expect(assetBody).toContain('人民币')
  expect(assetBody).toContain('采集节奏')
}

describe('dual build bases', () => {
  it('resolves the default Pages base and an explicit root base', () => {
    expect(resolveViteBase(undefined)).toBe('/kickstarter-dashboard/')
    expect(resolveViteBase('/')).toBe('/')
    expect(resolveViteBase('kickstarter-dashboard')).toBe('/kickstarter-dashboard/')
  })

  it('serves both bases with working entry assets', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'ks-base-'))
    const pagesDir = path.join(directory, 'pages')
    const rootDir = path.join(directory, 'root')
    try {
      await runBuild(undefined, pagesDir)
      await runBuild('/', rootDir)
      const pages = await serve(pagesDir, '/kickstarter-dashboard')
      const root = await serve(rootDir)
      try {
        await expectSite(pages.url, '/kickstarter-dashboard')
        await expectSite(root.url, '')
      } finally {
        await pages.close()
        await root.close()
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 120000)
})
