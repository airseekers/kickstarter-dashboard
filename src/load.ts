import aranixHistory from '../data/aranix/history/manifest.json'
import aranix from '../data/aranix/latest.json'
import tronHistory from '../data/tron/history/manifest.json'
import tron from '../data/tron/latest.json'
import { pageBasePath, publicBase } from '../shared/base.ts'
import { HISTORY_SCHEMA_VERSION, numericSeries, type ChartPoint, type HistoryManifest } from '../shared/history.ts'
import { projectKeyFromRoute, projectRouteFromPath, type ProjectRoute } from '../shared/routes.ts'
import type { DatasetFile } from '../shared/types.ts'

const datasets = {
  aranix: aranix as DatasetFile,
  tron: tron as DatasetFile,
}

const historyFiles = {
  aranix: aranixHistory,
  tron: tronHistory,
}

function manifestFor(key: 'aranix' | 'tron'): HistoryManifest | null {
  const manifest = historyFiles[key] as unknown as HistoryManifest
  if (manifest.schemaVersion !== HISTORY_SCHEMA_VERSION) return null
  if (manifest.projectKey !== key) return null
  if (!Array.isArray(manifest.observations)) return null
  return manifest
}

export function loadBackerSeries(route: ProjectRoute): ChartPoint[] {
  const manifest = manifestFor(projectKeyFromRoute(route))
  if (!manifest) return []
  return numericSeries(manifest, 'backersCount')
}

export function routeFromDocument(): ProjectRoute {
  const declared = document.body.dataset.project
  if (declared === 'TRON' || declared === 'ARANIX') return declared
  return projectRouteFromPath(window.location.pathname, pageBasePath(publicBase()))
}

export function loadDataset(route: ProjectRoute = routeFromDocument()): DatasetFile {
  return datasets[projectKeyFromRoute(route)]
}
