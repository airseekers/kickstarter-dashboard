import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { projectRouteFromPath } from '../shared/routes.ts'

describe('static project routes', () => {
  it('opens ARANIX when the Pages project root has no suffix', () => {
    expect(projectRouteFromPath('/kickstarter-dashboard')).toBe('ARANIX')
    expect(projectRouteFromPath('/kickstarter-dashboard/')).toBe('ARANIX')
    expect(projectRouteFromPath('/kickstarter-dashboard/ARANIX')).toBe('ARANIX')
    expect(projectRouteFromPath('/kickstarter-dashboard/ARANIX/')).toBe('ARANIX')
    expect(projectRouteFromPath('/kickstarter-dashboard/TRON')).toBe('TRON')
    expect(projectRouteFromPath('/kickstarter-dashboard/TRON/')).toBe('TRON')
    expect(projectRouteFromPath('/', '')).toBe('ARANIX')
    expect(projectRouteFromPath('/ARANIX/', '')).toBe('ARANIX')
    expect(projectRouteFromPath('/TRON', '')).toBe('TRON')
  })

  it('declares the uppercase directory pages and an ARANIX root document', () => {
    const root = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    const aranix = readFileSync(new URL('../ARANIX/index.html', import.meta.url), 'utf8')
    const tron = readFileSync(new URL('../TRON/index.html', import.meta.url), 'utf8')
    expect(root).toContain('data-project="ARANIX"')
    expect(aranix).toContain('data-project="ARANIX"')
    expect(tron).toContain('data-project="TRON"')
    expect(root).toContain('%CANONICAL%')
  })
})