import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { filesForDataset, projectsFile } from '../shared/files.ts'
import { buildSeedDataset, TRON_PROJECT } from '../shared/seed.ts'

const latestPath = path.resolve('data/tron/latest.json')
if (existsSync(latestPath) && readFileSync(latestPath, 'utf8').includes('"provenance": "flat"')) {
  console.error('latest.json 已经包含 Flat Data 快照，拒绝用种子覆盖。')
  process.exit(1)
}

const dataset = buildSeedDataset()
const files = {
  'data/projects.json': `${JSON.stringify(projectsFile([TRON_PROJECT]), null, 2)}\n`,
  ...filesForDataset(dataset),
}

for (const [relativePath, contents] of Object.entries(files)) {
  const fullPath = path.resolve(relativePath)
  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, contents)
}

console.log(`wrote ${Object.keys(files).length} seed files`)
