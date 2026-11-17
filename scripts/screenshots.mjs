import { mkdir } from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'

const origin = process.env.SCREENSHOT_ORIGIN ?? 'http://127.0.0.1:4173'
const directory = '/opt/cursor/artifacts'
await mkdir(directory, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 })

async function shoot(path, file, viewport) {
  await page.setViewportSize(viewport)
  const response = await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' })
  if (!response || response.status() >= 400) {
    throw new Error(`${path} returned ${response?.status()}`)
  }
  await page.screenshot({ path: `${directory}/${file}` })
}

await shoot('/kickstarter-dashboard/', 'aranix_root_desktop.png', { width: 2560, height: 1440 })
await shoot('/kickstarter-dashboard/ARANIX/', 'aranix_dashboard_desktop.png', { width: 2560, height: 1440 })
await shoot('/kickstarter-dashboard/ARANIX', 'aranix_noslash_desktop.png', { width: 2560, height: 1440 })
await shoot('/kickstarter-dashboard/TRON/', 'tron_dashboard_desktop.png', { width: 2560, height: 1440 })
await shoot('/kickstarter-dashboard/TRON', 'tron_noslash_desktop.png', { width: 2560, height: 1440 })
await shoot('/kickstarter-dashboard/ARANIX/', 'aranix_dashboard_mobile.png', { width: 390, height: 844 })
await page.screenshot({ path: `${directory}/aranix_dashboard_mobile_full.png`, fullPage: true })
await shoot('/kickstarter-dashboard/TRON/', 'tron_dashboard_mobile.png', { width: 390, height: 844 })
await browser.close()
