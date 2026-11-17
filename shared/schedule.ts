export const ARANIX_CRON = '17 * * * *'

export type ScheduleProject = 'aranix' | 'tron'

export function projectsForTrigger(event: {
  name: 'schedule' | 'workflow_dispatch'
  schedule?: string
  input?: string
}): ScheduleProject[] {
  if (event.name === 'schedule') {
    if (event.schedule === ARANIX_CRON) return ['aranix']
    return []
  }
  if (event.input === 'tron') return ['tron']
  return ['aranix']
}

export function collectionCopy(projectKey: string): { cadence: 'hourly' | 'unscheduled'; cron: string; beijing: string } {
  if (projectKey === 'aranix') {
    return {
      cadence: 'hourly',
      cron: ARANIX_CRON,
      beijing: '每小时第 17 分（UTC 与北京时间相同的分钟）。GitHub Actions 定时是尽力而为，不保证准点。',
    }
  }
  return {
    cadence: 'unscheduled',
    cron: '',
    beijing: '众筹已成功，公开数字不再定时抓取。页面保持 2026-11-16 的人工快照。',
  }
}
