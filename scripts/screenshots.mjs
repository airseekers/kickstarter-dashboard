import { mkdir } from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'

const base = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:4173/kickstarter-dashboard/'
const directory = '/opt/cursor/artifacts'
await mkdir(directory, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 })
await page.goto(base, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${directory}/tron_dashboard_desktop.png` })

await page.setViewportSize({ width: 390, height: 844 })
await page.screenshot({ path: `${directory}/tron_dashboard_mobile.png` })
await page.screenshot({ path: `${directory}/tron_dashboard_mobile_full.png`, fullPage: true })
await browser.close()
