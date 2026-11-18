import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { describe, expect, it } from 'vitest'
import { chromium, type Page } from 'playwright'

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('port')
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  return address.port
}

async function waitFor(url: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`server did not start: ${url}`)
}

async function fitsWidth(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const width = document.documentElement.clientWidth
    return rect.width > 0 && rect.left >= -1 && rect.right <= width + 1
  })
}

async function expectPageFits(page: Page) {
  const box = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1)
  const currency = page.getByRole('button', { name: '人民币' })
  await currency.scrollIntoViewIfNeeded()
  const currencyVisible = await currency.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.top >= -1 && rect.bottom <= window.innerHeight + 1
  })
  expect(currencyVisible).toBe(true)
  expect(await currency.getAttribute('aria-pressed')).toBe('true')

  const trend = page.locator('#backers-trend')
  await trend.scrollIntoViewIfNeeded()
  const trendVisible = await trend.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0
  })
  expect(trendVisible).toBe(true)
  expect(await fitsWidth(page, '#backers-trend')).toBe(true)
  const heading = await page.locator('h1').innerText()
  const trendText = await trend.innerText()
  if (heading.startsWith('TRON')) {
    expect(await page.locator('#backers-trend polyline').count()).toBe(0)
    expect(trendText).toContain('至少有两次真实成功观测')
    expect(trendText).toContain('1,389')
    expect(trendText).not.toContain('320')
  } else {
    expect(await page.locator('#backers-trend polyline').count()).toBe(1)
    expect(trendText).toContain('320')
    expect(trendText).toContain('309')
    expect(trendText).toContain('315')
    expect(trendText).not.toContain('1,389')
    expect(await fitsWidth(page, '#backers-trend .trend-plot')).toBe(true)
  }

  const collection = page.locator('#collection')
  await collection.scrollIntoViewIfNeeded()
  const visible = await collection.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0
  })
  expect(visible).toBe(true)
  expect(await fitsWidth(page, '#collection')).toBe(true)
}

describe('responsive pages', () => {
  let server: ChildProcess
  let origin = ''

  it('scrolls to the collection panel on narrow, short, wide, resized, and zoomed viewports', async () => {
    const port = await freePort()
    origin = `http://127.0.0.1:${port}`
    server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      stdio: 'ignore',
    })
    await waitFor(`${origin}/kickstarter-dashboard/`)
    const browser = await chromium.launch()
    const page = await browser.newPage()
    try {
    const paths = ['/kickstarter-dashboard/', '/kickstarter-dashboard/ARANIX/', '/kickstarter-dashboard/TRON/']
    const viewports = [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 768, height: 1024 },
      { width: 1280, height: 500 },
      { width: 2560, height: 1440 },
    ]
    for (const path of paths) {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' })
        await expectPageFits(page)
      }
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' })
      await page.setViewportSize({ width: 420, height: 640 })
      await expectPageFits(page)
      await page.evaluate(() => {
        document.documentElement.style.zoom = '2'
      })
      await expectPageFits(page)
      await page.evaluate(() => {
        document.documentElement.style.zoom = '1'
      })
    }
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`${origin}/kickstarter-dashboard/`, { waitUntil: 'networkidle' })
    const trendBefore = await page.locator('#backers-trend').innerText()
    const cnyAmount = await page.locator('.kpi-value').first().innerText()
    await page.getByRole('button', { name: '美元' }).click()
    expect(await page.getByRole('button', { name: '美元' }).getAttribute('aria-pressed')).toBe('true')
    expect(await page.locator('.kpi-value').first().innerText()).not.toBe(cnyAmount)
    expect(await page.locator('#backers-trend').innerText()).toBe(trendBefore)
    await page.getByRole('button', { name: '人民币' }).click()
    expect(await page.getByRole('button', { name: '人民币' }).getAttribute('aria-pressed')).toBe('true')
    await page.setViewportSize({ width: 390, height: 700 })
    await expectPageFits(page)
    } finally {
      await browser.close()
      server.kill()
    }
  }, 120000)
})
