import aranix from '../data/aranix/latest.json'
import tron from '../data/tron/latest.json'
import { pageBasePath, publicBase } from '../shared/base.ts'
import { projectKeyFromRoute, projectRouteFromPath, type ProjectRoute } from '../shared/routes.ts'
import type { DatasetFile } from '../shared/types.ts'

const datasets = {
  aranix: aranix as DatasetFile,
  tron: tron as DatasetFile,
}

export function routeFromDocument(): ProjectRoute {
  const declared = document.body.dataset.project
  if (declared === 'TRON' || declared === 'ARANIX') return declared
  return projectRouteFromPath(window.location.pathname, pageBasePath(publicBase()))
}

export function loadDataset(route: ProjectRoute = routeFromDocument()): DatasetFile {
  return datasets[projectKeyFromRoute(route)]
}
