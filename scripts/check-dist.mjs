import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

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
  if (!html.includes('/kickstarter-dashboard/assets/')) {
    throw new Error(`${name} asset path is not under /kickstarter-dashboard/`)
  }
}

if (!root.includes('ARANIX/')) {
  throw new Error('root is missing the ARANIX canonical path')
}
