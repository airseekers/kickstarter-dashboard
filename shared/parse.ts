import { campaignDays, parseCount } from './metrics.ts'
import { cityZh, countryZh, splitCityCountry } from './places.ts'
import { sanitizeValue } from './sanitize.ts'
import { formatUnixShanghai } from './time.ts'
import type { AcceptedPatch, GeoRow, ParseResult, ProjectConfig, SourceId } from './types.ts'

export function isChallengePage(raw: string): boolean {
  return (
    /Just a moment/i.test(raw) ||
    /cf-browser-verification/i.test(raw) ||
    /cf-mitigated/i.test(raw) ||
    /Attention Required/i.test(raw) ||
    /cdn-cgi\/challenge/i.test(raw) ||
    /Enable JavaScript and cookies/i.test(raw) ||
    /Sorry, you have been blocked/i.test(raw)
  )
}

export function htmlToLines(input: string): string[] {
  const withoutScripts = input
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
  const decoded = withoutScripts
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
  return decoded
    .replace(/<[^>]+>/g, '\n')
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean)
}

function normalizeLine(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^>\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^(\*\*|__)(.+)\1$/, '$2')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nonnegative(value: unknown): number | null {
  const number = finiteNumber(value)
  if (number === null || number < 0) return null
  return number
}

function nonnegativeInt(value: unknown): number | null {
  const number = nonnegative(value)
  if (number === null || !Number.isInteger(number)) return null
  return number
}

function numericString(value: unknown): string | null {
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return String(value)
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) return value
  return null
}

function identityText(raw: string, project: ProjectConfig): boolean {
  if (raw.toLowerCase().includes(project.slug.toLowerCase())) return true
  if (raw.includes(String(project.id))) return true
  if (project.key === 'tron' && raw.includes('Tron 360')) return true
  if (project.displayName.length >= 5 && new RegExp(`\\b${escapeRegExp(project.displayName)}\\b`, 'i').test(raw)) {
    return true
  }
  return false
}

function section(lines: string[], start: string, ends: string[]): string[] {
  const startAt = lines.findIndex((line) => line.toLowerCase() === start.toLowerCase())
  if (startAt < 0) return []
  let endAt = lines.length
  for (let index = startAt + 1; index < lines.length; index += 1) {
    if (ends.some((label) => lines[index].toLowerCase() === label.toLowerCase())) {
      endAt = index
      break
    }
  }
  return lines.slice(startAt + 1, endAt)
}

function isBackersLine(line: string): boolean {
  return /^[0-9][0-9,]*\s+backers?$/i.test(line)
}

function looksLikeCount(line: string): boolean {
  return isBackersLine(line) || /^[0-9][0-9,]*$/.test(line)
}

function backersAt(lines: string[], index: number): { backers: number; consumed: number } | null {
  if (index < 0 || index >= lines.length) return null
  const direct = lines[index].match(/^([0-9][0-9,]*)\s+backers?$/i)
  if (direct) {
    const backers = parseCount(direct[1])
    return backers === null ? null : { backers, consumed: 1 }
  }
  const bare = lines[index].match(/^([0-9][0-9,]*)$/)
  if (bare && index + 1 < lines.length && /^backers?\b/i.test(lines[index + 1])) {
    const backers = parseCount(bare[1])
    return backers === null ? null : { backers, consumed: 2 }
  }
  return null
}

function cityRow(rank: number, city: string, country: string, backers: number): GeoRow {
  const countryNames = countryZh(country)
  return {
    rank,
    nameEn: city,
    nameZh: cityZh(city),
    countryEn: country,
    countryZh: countryNames.zh,
    countryCode: countryNames.code,
    backers,
  }
}

function countryRow(rank: number, country: string, backers: number): GeoRow {
  const countryNames = countryZh(country)
  return {
    rank,
    nameEn: country,
    nameZh: countryNames.zh,
    countryEn: country,
    countryZh: countryNames.zh,
    countryCode: countryNames.code,
    backers,
  }
}

function parseCityRows(lines: string[]): GeoRow[] | null {
  const rows: GeoRow[] = []
  let index = 0
  while (index < lines.length) {
    const paired = backersAt(lines, index + 1)
    const split = paired ? splitCityCountry(lines[index]) : null
    if (paired && split) {
      rows.push(cityRow(rows.length + 1, split.city, split.country, paired.backers))
      index += 1 + paired.consumed
      continue
    }
    const stacked = backersAt(lines, index + 2)
    if (
      stacked &&
      !looksLikeCount(lines[index]) &&
      !looksLikeCount(lines[index + 1]) &&
      lines[index] &&
      lines[index + 1]
    ) {
      rows.push(cityRow(rows.length + 1, lines[index], lines[index + 1], stacked.backers))
      index += 2 + stacked.consumed
      continue
    }
    return null
  }
  return rows
}

function parseCountryRows(lines: string[]): GeoRow[] | null {
  const rows: GeoRow[] = []
  let index = 0
  while (index < lines.length) {
    const found = backersAt(lines, index + 1)
    if (!found || looksLikeCount(lines[index])) return null
    rows.push(countryRow(rows.length + 1, lines[index], found.backers))
    index += 1 + found.consumed
  }
  return rows
}

function countAfterLabel(lines: string[], label: string): number | null {
  const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase())
  if (index < 0) return null
  for (let cursor = index + 1; cursor < Math.min(lines.length, index + 6); cursor += 1) {
    const match = lines[cursor].match(/^([0-9][0-9,]*)(?:\s+backers?)?$/i)
    if (!match) continue
    return parseCount(match[1])
  }
  return null
}

function labelCount(flat: string, label: string): number | null {
  const match = flat.match(new RegExp(`\\b${label}\\s+([0-9][0-9,]*)\\b`, 'i'))
  if (!match) return null
  return parseCount(match[1])
}

function rejectRows(rows: GeoRow[], total: number | null): string | null {
  if (rows.length === 0) return '公开排行为空，拒绝用空列表覆盖已有数据。'
  if (rows.some((row) => row.backers < 0)) return '地区人数出现负数。'
  const sum = rows.reduce((totalBackers, row) => totalBackers + row.backers, 0)
  if (total !== null && sum > total) return '地区排行合计超过支持者总数。'
  return null
}

export function parseDownload(source: SourceId, raw: string, project: ProjectConfig): ParseResult {
  if (!raw.trim()) return { ok: false, status: 'empty', error: '响应体为空，未采纳。' }
  if (isChallengePage(raw)) {
    return {
      ok: false,
      status: 'blocked',
      error: '响应是 Cloudflare 或访问挑战页面，未采纳，也未写入原始 HTML。',
    }
  }
  switch (source) {
    case 'search':
      return parseSearch(raw, project)
    case 'project_json':
      return parseProjectFragment(raw, project)
    case 'community':
      return parseCommunity(raw, project)
    case 'faqs':
      return parseFaqs(raw, project)
  }
}

function parseSearch(raw: string, project: ProjectConfig): ParseResult {
  if (raw.trim().startsWith('<')) {
    return { ok: false, status: 'blocked', error: '搜索接口返回了 HTML，而不是 JSON。' }
  }
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return { ok: false, status: 'parse_error', error: '搜索响应不是合法 JSON。' }
  }
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { projects?: unknown }).projects)) {
    return { ok: false, status: 'invalid', error: '搜索 JSON 缺少 projects 数组。' }
  }
  const projects = (payload as { projects: unknown[] }).projects
  const matches = projects.filter((item) => {
    if (!item || typeof item !== 'object') return false
    const candidate = item as {
      id?: unknown
      slug?: unknown
      creator?: { slug?: unknown }
    }
    return (
      candidate.id === project.id &&
      candidate.slug === project.slug &&
      candidate.creator?.slug === project.creator
    )
  })
  if (matches.length !== 1) {
    const seen = projects
      .map((item) => (item && typeof item === 'object' ? (item as { id?: unknown }).id : null))
      .filter((id) => typeof id === 'number')
    return {
      ok: false,
      status: 'mismatch',
      error: `没有唯一匹配 ${project.id}/${project.slug}。候选 id：${seen.join(', ') || '无'}。`,
    }
  }
  const item = matches[0] as Record<string, unknown>
  const pledged = nonnegative(item.pledged)
  const goal = nonnegative(item.goal)
  const backersCount = nonnegativeInt(item.backers_count)
  const percentFunded = nonnegative(item.percent_funded)
  if (pledged === null || goal === null || backersCount === null || percentFunded === null) {
    return { ok: false, status: 'invalid', error: '筹款金额、目标、支持人数或达成率不是非负数字。' }
  }
  if (goal > 0) {
    const expected = (pledged / goal) * 100
    if (Math.abs(expected - percentFunded) > Math.max(1, expected * 0.01)) {
      return { ok: false, status: 'invalid', error: 'percent_funded 与 pledged/goal 不一致。' }
    }
  }
  const usdPledged = item.usd_pledged === undefined ? null : numericString(item.usd_pledged)
  if (item.usd_pledged !== undefined && item.usd_pledged !== null && usdPledged === null) {
    return { ok: false, status: 'invalid', error: 'usd_pledged 不是非负数字字符串。' }
  }
  const converted = item.converted_pledged_amount === undefined || item.converted_pledged_amount === null
    ? null
    : nonnegative(item.converted_pledged_amount)
  if (item.converted_pledged_amount !== undefined && item.converted_pledged_amount !== null && converted === null) {
    return { ok: false, status: 'invalid', error: 'converted_pledged_amount 不是非负数字。' }
  }
  const launchedUnix = finiteNumber(item.launched_at)
  const deadlineUnix = finiteNumber(item.deadline)
  const createdUnix = finiteNumber(item.created_at)
  const stateChangedUnix = finiteNumber(item.state_changed_at)
  if (launchedUnix === null || deadlineUnix === null || createdUnix === null || stateChangedUnix === null) {
    return { ok: false, status: 'invalid', error: '时间戳缺失或不是数字。' }
  }
  const creator = item.creator as { name?: unknown } | undefined
  const location = item.location as { displayable_name?: unknown; short_name?: unknown } | null
  const category = item.category as { name?: unknown } | null
  const patch: AcceptedPatch = {
    project: {
      name: typeof item.name === 'string' ? item.name : project.displayName,
      blurb: typeof item.blurb === 'string' ? item.blurb : '',
      state: typeof item.state === 'string' ? item.state : 'unknown',
      staffPick: typeof item.staff_pick === 'boolean' ? item.staff_pick : null,
      spotlight: typeof item.spotlight === 'boolean' ? item.spotlight : null,
      isLaunched: typeof item.is_launched === 'boolean' ? item.is_launched : null,
      prelaunchActivated: typeof item.prelaunch_activated === 'boolean' ? item.prelaunch_activated : null,
      isInPostCampaignPledgingPhase:
        typeof item.is_in_post_campaign_pledging_phase === 'boolean'
          ? item.is_in_post_campaign_pledging_phase
          : null,
      country: typeof item.country === 'string' ? item.country : '',
      locationName:
        location && typeof location.displayable_name === 'string'
          ? location.displayable_name
          : location && typeof location.short_name === 'string'
            ? location.short_name
            : null,
      categoryName: category && typeof category.name === 'string' ? category.name : null,
      currency: typeof item.currency === 'string' ? item.currency : 'HKD',
      url: `https://www.kickstarter.com/projects/${project.creator}/${project.slug}`,
    },
    snapshot: {
      pledged,
      goal,
      percentFunded,
      backersCount,
      usdPledged,
      convertedPledgedAmount: converted,
      staticUsdRate: item.static_usd_rate === null ? null : nonnegative(item.static_usd_rate),
      usdExchangeRate: item.usd_exchange_rate === null ? null : nonnegative(item.usd_exchange_rate),
      fxRate: item.fx_rate === null ? null : nonnegative(item.fx_rate),
      currentCurrency: typeof item.current_currency === 'string' ? item.current_currency : null,
      createdAt: formatUnixShanghai(createdUnix),
      launchedAt: formatUnixShanghai(launchedUnix),
      deadline: formatUnixShanghai(deadlineUnix),
      stateChangedAt: formatUnixShanghai(stateChangedUnix),
      campaignDays: campaignDays(launchedUnix, deadlineUnix),
    },
  }
  if (creator && typeof creator.name === 'string' && creator.name !== 'Airseekers') {
    patch.project = { ...patch.project, name: patch.project?.name }
  }
  return {
    ok: true,
    patch,
    sanitizedRaw: sanitizeValue({
      total_hits: (payload as { total_hits?: unknown }).total_hits ?? null,
      project: item,
    }),
  }
}

function activityResult(
  project: ProjectConfig,
  faqs: number,
  updates: number,
  comments: number,
): ParseResult {
  return {
    ok: true,
    patch: { snapshot: { faqs, updates, comments } },
    sanitizedRaw: { faqs, updates, comments, projectId: project.id },
  }
}

function activityCounts(flat: string): { faqs: number; updates: number; comments: number } | null {
  const faqs = labelCount(flat, 'FAQ')
  const updates = labelCount(flat, 'Updates')
  const comments = labelCount(flat, 'Comments')
  if (faqs === null || updates === null || comments === null) return null
  return { faqs, updates, comments }
}

function parseProjectFragment(raw: string, project: ProjectConfig): ParseResult {
  if (raw.trim().startsWith('<')) {
    return { ok: false, status: 'blocked', error: '项目片段接口返回了整页 HTML，而不是 running_board/content/card JSON。' }
  }
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return parseProjectFragmentText(raw, project)
  }
  if (!payload || typeof payload !== 'object' || typeof (payload as { content?: unknown }).content !== 'string') {
    return { ok: false, status: 'invalid', error: '项目片段缺少 content HTML。' }
  }
  const fragment = payload as { running_board?: unknown; content: string; card?: unknown }
  const blob = [fragment.running_board, fragment.content, fragment.card]
    .filter((part): part is string => typeof part === 'string')
    .join('\n')
  if (!identityText(blob, project)) {
    return { ok: false, status: 'mismatch', error: '项目片段里找不到目标项目名称、slug 或 id。' }
  }
  const counts = activityCounts(blob.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  if (!counts) {
    return { ok: false, status: 'parse_error', error: '项目片段导航里没有同时解析出 FAQ、Updates、Comments 计数。' }
  }
  return activityResult(project, counts.faqs, counts.updates, counts.comments)
}

function parseProjectFragmentText(raw: string, project: ProjectConfig): ParseResult {
  if (!identityText(raw, project)) {
    return { ok: false, status: 'mismatch', error: '项目片段里找不到目标项目名称、slug 或 id。' }
  }
  const counts = activityCounts(raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  if (!counts) {
    return { ok: false, status: 'parse_error', error: '项目片段导航里没有同时解析出 FAQ、Updates、Comments 计数。' }
  }
  return activityResult(project, counts.faqs, counts.updates, counts.comments)
}

function parseCommunity(raw: string, project: ProjectConfig): ParseResult {
  if (!identityText(raw, project)) {
    return { ok: false, status: 'mismatch', error: 'Community 页面里找不到目标项目。' }
  }
  const lines = htmlToLines(raw)
  const header = lines.find((line) => /^last updated\b/i.test(line)) ?? null
  const supporting = lines.find((line) => /people are supporting/i.test(line))
  const supportingCount = supporting ? parseCount(supporting.match(/([0-9][0-9,]*)/)?.[1] ?? '') : null
  const cities = parseCityRows(section(lines, 'Top Cities', ['Where Backers Come From', 'Top Countries']))
  const countries = parseCountryRows(section(lines, 'Top Countries', ['New Backers', 'Returning Backers']))
  const newBackers = countAfterLabel(lines, 'New Backers')
  const returningBackers = countAfterLabel(lines, 'Returning Backers')
  if (!cities || !countries || supportingCount === null || newBackers === null || returningBackers === null) {
    return {
      ok: false,
      status: 'parse_error',
      error: 'Community 页面没有同时解析出城市、国家、支持人数、新支持和既有支持。',
    }
  }
  const cityError = rejectRows(cities, supportingCount)
  const countryError = rejectRows(countries, supportingCount)
  if (cityError || countryError) {
    return { ok: false, status: 'invalid', error: cityError ?? countryError ?? '地区排行无效。' }
  }
  if (supportingCount !== null && newBackers + returningBackers !== supportingCount) {
    return {
      ok: false,
      status: 'invalid',
      error: `新支持 ${newBackers} 与既有支持 ${returningBackers} 之和不等于支持人数 ${supportingCount}。`,
    }
  }
  return {
    ok: true,
    patch: {
      snapshot: {
        countries,
        cities,
        newBackers,
        returningBackers,
        communityPageHeaderText: header,
        geographyUpdatedAt: null,
      },
    },
    sanitizedRaw: {
      projectId: project.id,
      communityPageHeaderText: header,
      geographyUpdatedAt: null,
      newBackers,
      returningBackers,
      countries: countries.map((row) => ({ name: row.nameEn, backers: row.backers })),
      cities: cities.map((row) => ({ name: row.nameEn, country: row.countryEn, backers: row.backers })),
    },
  }
}

function parseFaqs(raw: string, project: ProjectConfig): ParseResult {
  if (!identityText(raw, project) || !/faq/i.test(raw)) {
    return { ok: false, status: 'mismatch', error: 'FAQ 页面里找不到目标项目。' }
  }
  const header = htmlToLines(raw).find((line) => /^last updated\b/i.test(line)) ?? null
  return {
    ok: true,
    patch: {},
    sanitizedRaw: {
      projectId: project.id,
      pageReached: true,
      pageHeaderText: header,
      bodiesArchived: false,
    },
  }
}
