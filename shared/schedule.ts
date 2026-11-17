export const ARANIX_CRON = '17 * * * *'
export const TRON_UTC_HOUR = 2

export type ScheduleProject = 'aranix' | 'tron'

export function projectsForTrigger(event: {
  name: 'schedule' | 'workflow_dispatch'
  schedule?: string
  input?: string
  utcHour?: number
}): ScheduleProject[] {
  if (event.name === 'schedule') {
    if (event.schedule !== ARANIX_CRON) return []
    const projects: ScheduleProject[] = ['aranix']
    if (event.utcHour === TRON_UTC_HOUR) projects.push('tron')
    return projects
  }
  if (event.input === 'tron') return ['tron']
  if (event.input === 'both') return ['aranix', 'tron']
  return ['aranix']
}

export function collectionCopy(projectKey: string): { cadence: 'hourly' | 'daily'; cron: string; beijing: string } {
  if (projectKey === 'aranix') {
    return {
      cadence: 'hourly',
      cron: ARANIX_CRON,
      beijing: '每小时第 17 分（UTC 与北京时间相同的分钟）。GitHub Actions 定时是尽力而为，不保证准点。',
    }
  }
  return {
    cadence: 'daily',
    cron: '17 2 * * *',
    beijing: '每天 02:17 UTC，即北京时间 10:17。与 ARANIX 共用每小时第 17 分的那一次运行，只有 UTC 小时为 2 时才抓 TRON。Actions 定时是尽力而为，不保证准点。',
  }
}
