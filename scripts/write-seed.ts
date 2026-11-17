import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { ARANIX_CAPTURED_AT, ARANIX_PROJECT, buildAranixDataset } from '../shared/aranix.ts'
import { filesForDataset, projectsFile } from '../shared/files.ts'
import { emptyManifest } from '../shared/history.ts'
import { buildSeedDataset, TRON_PROJECT } from '../shared/seed.ts'

for (const key of ['tron', 'aranix']) {
  const latestPath = path.resolve(`data/${key}/latest.json`)
  if (existsSync(latestPath) && readFileSync(latestPath, 'utf8').includes('"provenance": "flat"')) {
    console.error(`${key} latest.json 已经包含 Flat Data 快照，拒绝用种子覆盖。`)
    process.exit(1)
  }
}

const files: Record<string, string> = {
  'data/projects.json': `${JSON.stringify(projectsFile([ARANIX_PROJECT, TRON_PROJECT]), null, 2)}\n`,
  ...filesForDataset(buildAranixDataset()),
  ...filesForDataset(buildSeedDataset()),
}
for (const [key, capturedAt] of [
  ['tron', '2026-11-16T23:12:00+08:00'],
  ['aranix', ARANIX_CAPTURED_AT],
] as const) {
  const relativePath = `data/${key}/history/manifest.json`
  if (existsSync(relativePath)) {
    const current = JSON.parse(readFileSync(relativePath, 'utf8')) as { observations?: unknown[]; attempts?: unknown[] }
    if ((current.observations?.length ?? 0) > 0 || (current.attempts?.length ?? 0) > 0) continue
  }
  files[relativePath] = `${JSON.stringify(emptyManifest(key, capturedAt), null, 2)}\n`
}

for (const [relativePath, contents] of Object.entries(files)) {
  const fullPath = path.resolve(relativePath)
  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, contents)
}

console.log(`wrote ${Object.keys(files).length} seed files`)
