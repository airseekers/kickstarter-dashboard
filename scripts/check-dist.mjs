import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function assetBaseFor(raw) {
  if (raw === undefined || raw.trim() === '') return '/kickstarter-dashboard/assets/'
  if (raw.trim() === '/') return '/assets/'
  const prefixed = raw.trim().startsWith('/') ? raw.trim() : `/${raw.trim()}`
  const withSlash = prefixed.endsWith('/') ? prefixed : `${prefixed}/`
  return `${withSlash}assets/`
}

const assetBase = assetBaseFor(process.env.VITE_BASE)
const canonical = assetBase.startsWith('/assets/') ? '/ARANIX/' : '/kickstarter-dashboard/ARANIX/'
const root = read('dist/index.html')
const aranix = read('dist/ARANIX/index.html')
const tron = read('dist/TRON/index.html')
const aranixFile = read('dist/ARANIX.html')
const tronFile = read('dist/TRON.html')

for (const [name, html, project] of [
  ['root', root, 'ARANIX'],
  ['ARANIX/index', aranix, 'ARANIX'],
  ['ARANIX.html', aranixFile, 'ARANIX'],
  ['TRON/index', tron, 'TRON'],
  ['TRON.html', tronFile, 'TRON'],
]) {
  if (!html.includes(`data-project="${project}"`)) {
    throw new Error(`${name} is missing data-project=${project}`)
  }
  if (name === 'root' && !html.includes(`href="${canonical}"`)) {
    throw new Error(`${name} canonical is not ${canonical}`)
  }
  if (!html.includes(assetBase)) {
    throw new Error(`${name} asset path is not under ${assetBase}`)
  }
}

if (!root.includes('ARANIX/')) {
  throw new Error('root is missing the ARANIX canonical path')
}
