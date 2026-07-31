function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

export function normalizeTrendScoreReport(value) {
  const envelope = asRecord(value)
  const report = asRecord(envelope?.data) || envelope
  const content = asRecord(report?.content)
  const display = asRecord(content?.display_report)
  if (!display) return null

  const summary = typeof display.summary === 'string' ? display.summary.trim() : ''
  const details = typeof display.details === 'string' ? display.details.trim() : ''
  if (!summary && !details) return null

  return {
    reportDate: typeof report.report_date === 'string' ? report.report_date : '',
    createdAt: typeof report.created_at === 'string' ? report.created_at : '',
    summary,
    details,
    risks: Array.isArray(display.risks)
      ? display.risks.filter((item) => typeof item === 'string')
      : [],
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractReportSection(details, heading) {
  if (typeof details !== 'string' || typeof heading !== 'string') return ''
  const pattern = new RegExp(
    `^##\\s+${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`,
    'm',
  )
  return pattern.exec(details)?.[1]?.trim() || ''
}

export function hasStructuredTrendDetails(details) {
  return ['维度解读', '趋势判断', '赛道分析', '关注建议']
    .some((heading) => extractReportSection(details, heading))
}

export function toBulletItems(value) {
  if (typeof value !== 'string') return []
  return value
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
}

export function shanghaiDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
