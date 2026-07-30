<template>
  <div class="ai-event-report" v-if="detail">
    <!-- 固定顶部 AI 思考状态头部 -->
    <div class="thinking-header" :class="{ done: isComplete }">
      <!-- 第一行：返回 + 标题 -->
      <div class="header-row title-row">
        <el-button class="back-btn" circle size="small" @click="$emit('back')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <el-icon class="header-icon"><Monitor /></el-icon>
        <span class="header-title">AI事件分析</span>
      </div>

      <!-- 完成态：简短完成提示 -->
      <div class="header-row done-row" v-if="isComplete">
        <el-tag type="success" size="small">✓ 分析完成</el-tag>
      </div>
      <div class="header-row phase-row" v-else>
        <el-tag type="primary" size="small" effect="plain">
          <el-icon class="is-loading"><Loading /></el-icon>
          AI正在分析...
        </el-tag>
      </div>
    </div>

    <div class="report-content">
      <!-- 来源信息 -->
      <div class="source-info-bar">
        <span class="source-label">来源：</span>
        <a
          v-if="detail.event.sourceInfo?.url"
          class="source-link"
          :href="detail.event.sourceInfo.url"
          target="_blank"
          rel="noopener noreferrer"
        >{{ detail.event.sourceInfo.name }}</a>
        <span v-else-if="detail.event.source" class="source-text">{{ detail.event.source }}</span>
        <span v-else class="source-unverified">来源暂不可验证</span>
      </div>

      <!-- 投资总结 -->
      <el-card v-if="detail.investmentSummary" class="analysis-card" shadow="never">
        <template #header>
          <div class="card-header-row">
            <span class="step-number completed">✓</span>
            <span class="card-title">AI投资机会</span>
            <el-tag :type="ratingTagType" size="small">{{ ratingLabel }}</el-tag>
          </div>
        </template>
        <div class="investment-summary">
          <p class="conclusion">{{ detail.investmentSummary.conclusion }}</p>
          <div v-if="detail.investmentSummary.keyPoints?.length" class="key-points">
            <h4>关键点</h4>
            <ul>
              <li v-for="(point, idx) in detail.investmentSummary.keyPoints" :key="idx">{{ point }}</li>
            </ul>
          </div>
          <div v-if="detail.investmentSummary.opportunities?.length" class="opportunities">
            <h4>存在机会</h4>
            <ul>
              <li v-for="(opp, idx) in detail.investmentSummary.opportunities" :key="idx">{{ opp }}</li>
            </ul>
          </div>
          <div v-if="detail.investmentSummary.risks?.length" class="risks">
            <h4>风险提示</h4>
            <ul>
              <li v-for="(risk, idx) in detail.investmentSummary.risks" :key="idx">{{ risk }}</li>
            </ul>
          </div>
        </div>
      </el-card>

      <!-- 事件理解 -->
      <el-card v-if="detail.eventUnderstanding" class="analysis-card" shadow="never">
        <template #header>
          <div class="card-header-row">
            <span class="step-number completed">✓</span>
            <span class="card-title">事件理解</span>
          </div>
        </template>
        <div class="understanding-content">
          <p class="summary">{{ detail.eventUnderstanding.summary }}</p>
          <div v-if="detail.eventUnderstanding.coreChanges?.length" class="core-changes">
            <h4>核心变化</h4>
            <el-table :data="detail.eventUnderstanding.coreChanges" size="small" border>
              <el-table-column prop="variable" label="变量" />
              <el-table-column prop="before" label="变化前" />
              <el-table-column prop="after" label="变化后" />
            </el-table>
          </div>
        </div>
      </el-card>

      <!-- 传导分析 -->
      <el-card v-if="detail.transmissionAnalysis" class="analysis-card" shadow="never">
        <template #header>
          <div class="card-header-row">
            <span class="step-number completed">✓</span>
            <span class="card-title">AI影响传导推理</span>
          </div>
        </template>
        <div class="transmission-content">
          <p class="mechanism">{{ detail.transmissionAnalysis.mechanism }}</p>
          <div v-if="detail.transmissionAnalysis.chain?.length" class="chain-list">
            <h4>传导链</h4>
            <el-table :data="detail.transmissionAnalysis.chain" size="small" border>
              <el-table-column prop="industry" label="行业" />
              <el-table-column prop="relation" label="关系" />
              <el-table-column label="方向">
                <template #default="{ row }">
                  <el-tag :type="row.direction === 'bullish' ? 'danger' : row.direction === 'bearish' ? 'success' : 'info'" size="small">
                    {{ row.direction }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="level" label="层级" />
              <el-table-column prop="impactStrength" label="强度">
                <template #default="{ row }">{{ (row.impactStrength * 100).toFixed(0) }}%</template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-card>

      <!-- 历史事件 -->
      <el-card v-if="detail.historyEvents?.length" class="analysis-card" shadow="never">
        <template #header>
          <div class="card-header-row">
            <span class="step-number completed">✓</span>
            <span class="card-title">历史验证</span>
          </div>
        </template>
        <div class="history-content">
          <el-timeline>
            <el-timeline-item
              v-for="event in detail.historyEvents"
              :key="event.historyId"
              :timestamp="event.year"
              placement="top"
            >
              <el-card shadow="hover" :body-style="{ padding: '12px' }">
                <h5>{{ event.title }}</h5>
                <el-tag :type="event.sentiment === 'bullish' ? 'danger' : event.sentiment === 'bearish' ? 'success' : 'info'" size="small">
                  {{ event.sentiment === 'bullish' ? '利好' : event.sentiment === 'bearish' ? '利空' : '中性' }}
                </el-tag>
                <p class="history-change">{{ event.industryChange }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-card>
    </div>

    <div class="report-footer" v-if="isComplete">
      <el-alert type="info" :closable="false" show-icon>
        以上分析由 AI 生成，不构成投资建议
      </el-alert>
    </div>
  </div>

  <el-empty v-else description="暂无分析数据" />
</template>

<script>
/**
 * AiEventReport - AI 事件分析报告组件
 *
 * 展示完整的 AI 分析结果，包括：
 * - AI 投资机会
 * - 事件理解
 * - 影响传导推理
 * - 历史验证
 *
 * Props:
 * - detail: Object — 事件详情数据（与 eventAdapter.adaptEventDetail 输出结构一致）
 *
 * Emits:
 * - back — 返回上一页
 */
import { computed } from 'vue'
import { ArrowLeft, Monitor, Loading } from '@element-plus/icons-vue'

export default {
  name: 'AiEventReport',
  components: {
    ArrowLeft,
    Monitor,
    Loading,
  },
  props: {
    /** 事件详情数据（与 eventAdapter.adaptEventDetail 输出结构一致） */
    detail: {
      type: Object,
      default: null,
    },
  },
  emits: ['back'],
  setup(props) {
    // 是否分析完成（有数据就认为完成）
    const isComplete = computed(() => {
      return props.detail?.investmentSummary !== undefined
    })

    // 评级标签类型
    const ratingTagType = computed(() => {
      const rating = props.detail?.investmentSummary?.rating
      if (rating === 'positive') return 'success'
      if (rating === 'negative') return 'danger'
      return 'info'
    })

    // 评级文本
    const ratingLabel = computed(() => {
      const rating = props.detail?.investmentSummary?.rating
      if (rating === 'positive') return '整体偏积极'
      if (rating === 'negative') return '整体偏谨慎'
      return '整体中性'
    })

    return {
      isComplete,
      ratingTagType,
      ratingLabel,
    }
  },
}
</script>

<style scoped>
.ai-event-report {
  padding: 70px 0 24px;
  min-height: 100vh;
  background: #f9fafb;
}

/* 固定头部 */
.thinking-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.3s;
}

.thinking-header.done {
  border-bottom-color: #d1fae5;
}

.header-row {
  display: flex;
  align-items: center;
}

.title-row {
  gap: 10px;
  margin-bottom: 8px;
}

.header-icon {
  color: #4d7cfe;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.done-row,
.phase-row {
  margin-top: 4px;
}

.report-content {
  padding: 16px 24px;
}

/* 来源信息栏 */
.source-info-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: 16px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.source-label {
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}

.source-link {
  font-size: 12px;
  color: #3b82f6;
  text-decoration: none;
}

.source-link:hover {
  text-decoration: underline;
}

.source-text {
  font-size: 12px;
  color: #374151;
}

.source-unverified {
  font-size: 12px;
  font-style: italic;
  color: #9ca3af;
}

/* 分析卡片 */
.analysis-card {
  margin-bottom: 16px;
  border-radius: 12px;
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.step-number.completed {
  background: #d1fae5;
  color: #059669;
}

.card-title {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

/* 投资总结 */
.investment-summary .conclusion {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
  margin-bottom: 16px;
}

.investment-summary h4 {
  font-size: 12px;
  color: #3b82f6;
  margin-bottom: 8px;
}

.investment-summary ul {
  margin: 0 0 16px;
  padding-left: 20px;
}

.investment-summary li {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 4px;
}

.investment-summary .risks h4 {
  color: #ef4444;
}

.investment-summary .risks li {
  color: #dc2626;
}

/* 事件理解 */
.understanding-content .summary {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
  margin-bottom: 12px;
}

.understanding-content h4 {
  font-size: 12px;
  color: #3b82f6;
  margin-bottom: 8px;
}

/* 传导分析 */
.transmission-content .mechanism {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
  margin-bottom: 12px;
}

.transmission-content h4 {
  font-size: 12px;
  color: #3b82f6;
  margin-bottom: 8px;
}

.chain-list {
  margin-top: 12px;
}

/* 历史事件 */
.history-content h5 {
  font-size: 13px;
  color: #111827;
  margin-bottom: 6px;
}

.history-change {
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
}

/* 底部 */
.report-footer {
  padding: 24px;
}
</style>