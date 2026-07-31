import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractReportSection,
  hasStructuredTrendDetails,
  normalizeTrendScoreReport,
  toBulletItems,
} from '../src/modules/market/utils/trendReport.mjs'

test('normalizes the public response and preserves the actual report date', () => {
  const report = normalizeTrendScoreReport({
    code: 0,
    data: {
      report_date: '2026-07-30',
      created_at: '2026-07-31T01:00:00.000Z',
      content: {
        display_report: {
          summary: '趋势延续',
          details: '## 维度解读\n- 技术面强势\n- 赛道景气\n\n## 关注建议\n控制仓位',
          risks: ['高位波动'],
        },
      },
    },
  })

  assert.deepEqual(report, {
    reportDate: '2026-07-30',
    createdAt: '2026-07-31T01:00:00.000Z',
    summary: '趋势延续',
    details: '## 维度解读\n- 技术面强势\n- 赛道景气\n\n## 关注建议\n控制仓位',
    risks: ['高位波动'],
  })
  assert.deepEqual(
    toBulletItems(extractReportSection(report.details, '维度解读')),
    ['技术面强势', '赛道景气'],
  )
  assert.equal(extractReportSection(report.details, '不存在'), '')
})

test('returns null for a missing or malformed report', () => {
  assert.equal(normalizeTrendScoreReport({ code: 0, data: null }), null)
  assert.equal(normalizeTrendScoreReport({ content: {} }), null)
})

test('does not treat standalone risks as parsed report details', () => {
  assert.equal(
    hasStructuredTrendDetails('这是一段没有标准小标题的完整分析。'),
    false,
  )
  assert.equal(
    hasStructuredTrendDetails('## 趋势判断\n保持谨慎乐观'),
    true,
  )
})
