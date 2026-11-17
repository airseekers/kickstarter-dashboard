import latest from '../data/tron/latest.json'
import type { DatasetFile } from '../shared/types.ts'

export function loadDataset(): DatasetFile {
  return latest as DatasetFile
}
