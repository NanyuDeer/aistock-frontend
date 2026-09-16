<template>
  <div class="ai-event-report" v-if="detail">
    <div class="report-layout">
      <!-- 侧栏：≥1200px 为左侧粘性竖向步骤轨（滚动到对应段落自动点亮）；窄屏回到内容顶部 -->
      <aside class="report-rail">
        <nav class="rail-nav" aria-label="分析路径">
          <div
            v-for="(step, idx) in stepItems"
            :key="step.key"
            class="rail-step"
            :class="{
              'is-done': stepStatus(step.key) === 'completed',
              'is-active': activeStep === step.key,
              'is-passed': isPassed(idx),
            }"
            @click="scrollToStep(step.key)"
          >
            <span class="rail-node">
              <span class="rail-node-line"></span>
              <span class="rail-node-dot"></span>
            </span>
            <span class="rail-label">{{ step.label }}</span>
            <el-icon
              v-if="stepStatus(step.key) === 'processing'"
              class="is-loading rail-loading"
            ><Loading /></el-icon>
          </div>
        </nav>
      </aside>

      <div class="report-main">
        <!-- Hero 卡（报告首屏，步骤轨第 1 步「洞见事件」的锚点）：白底 + 左侧蓝色竖条 + 标题/来源/时间/类型 + 评级徽章（对齐 APP） -->
        <div class="hero-card" id="step-insight">
          <div class="hero-bar"></div>
          <div class="hero-title">{{ detail.event.title }}</div>
          <div class="hero-meta">
            <span class="meta-label">来源：</span>
            <a
              v-if="detail.event.sourceInfo?.url"
              class="meta-link"
              :href="detail.event.sourceInfo.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ detail.event.sourceInfo.name }}</a>
            <span v-else-if="detail.event.sourceInfo?.name" class="meta-source">{{ detail.event.sourceInfo.name }}</span>
            <span v-else-if="detail.event.source" class="meta-source">{{ detail.event.source }}</span>
            <span v-else class="meta-unverified">暂无原文链接</span>
            <span class="meta-dot">·</span>
            <span class="meta-time">{{ formatTime(detail.event.publishTime) }}</span>
            <template v-if="detail.event.eventType">
              <span class="meta-dot">·</span>
              <span class="meta-type">{{ detail.event.eventType }}</span>
            </template>
          </div>
          <!-- 评级徽章：A股红涨绿跌 + ★ 前缀 -->
          <div
            v-if="detail.investmentSummary"
            class="hero-rating"
            :class="'rating-' + detail.investmentSummary.rating"
          >
            <span class="rating-text">{{ ratingLabel }}</span>
          </div>
        </div>

        <!-- 洞见卡（步骤轨第 1 步「洞见事件」）：分析中占位 → 完成后呈现 -->
        <div v-if="insightCard.content && stepStatus('insight') === 'processing'" class="insight-card is-streaming">
          <el-icon class="is-loading stream-spinner"><Loading /></el-icon>
          <span class="stream-hint">AI开始分析…</span>
        </div>
        <div v-else-if="insightCard.content && stepStatus('insight') === 'completed'" class="insight-card">
          <div class="insight-head">
            <span class="insight-wordmark"></span>
            <span class="wm-dot">·</span>
            <span class="wm-label">事件</span>
          </div>
          <div class="insight-title">{{ insightCard.content }}</div>
          <div class="insight-divider"></div>
          <div v-if="insightCard.trace" class="insight-line is-trace">
            <span class="insight-key">溯源</span>
            <span class="insight-text">{{ insightCard.trace }}</span>
          </div>
          <div v-if="insightCard.forecast" class="insight-line is-forecast">
            <span class="insight-key">预判</span>
            <span class="insight-text">{{ insightCard.forecast }}</span>
          </div>
        </div>

        <!-- Step 01: 投资机会洞见 -->
        <AiAnalysisSection
          v-if="detail.investmentSummary && isVisible('investment')"
          id="step-investment"
          :step-number="1"
          title="投资机会洞见"
          :status="stepStatus('investment')"
        >
          <InvestmentSummaryCard :data="detail.investmentSummary" />
        </AiAnalysisSection>

        <!-- 投资逻辑解析（过渡模块，无编号，不属于步骤轨，镜像 APP InvestmentLogicHeader） -->
        <InvestmentLogicHeader v-if="logicReady && stepStatus('investment') === 'completed'" />

        <!-- Step 02: 事件理解 -->
        <AiAnalysisSection
          v-if="detail.eventUnderstanding && isVisible('understanding')"
          id="step-understanding"
          :step-number="2"
          title="事件理解"
          :status="stepStatus('understanding')"
        >
          <AiEventUnderstanding :data="detail.eventUnderstanding" />
        </AiAnalysisSection>

        <!-- Step 03: 事件影响传导推理 -->
        <AiAnalysisSection
          v-if="detail.transmissionAnalysis && isVisible('transmission')"
          id="step-transmission"
          :step-number="3"
          title="事件影响传导推理"
          :status="stepStatus('transmission')"
        >
          <AiTransmissionAnalysis :data="detail.transmissionAnalysis" :event-title="detail.event.title" />
        </AiAnalysisSection>

        <!-- Step 04: 历史验证 -->
        <AiAnalysisSection
          v-if="detail.historyEvents?.length && isVisible('history')"
          id="step-history"
          :step-number="4"
          title="历史验证"
          :status="stepStatus('history')"
        >
          <HistoryTimeline :events="detail.historyEvents" />
        </AiAnalysisSection>

        <div class="report-footer" v-if="streamDone">
          <el-alert type="info" :closable="false" show-icon>
            以上分析由 AI 生成，不构成投资建议
          </el-alert>
        </div>
      </div>
    </div>
  </div>

  <el-empty v-else description="暂无分析数据" />
</template>

<script>
/**
 * AiEventReport - Web 端 AI 事件分析报告组件（镜像 APP AiEventReport）
 *
 * 结构对齐 APP（AiEventReport.vue）：
 * - 左侧粘性步骤轨（5 步：洞见事件 / 投资机会洞见 / 事件理解 / 事件影响传导推理 / 历史验证）
 * - Hero 卡（左蓝竖条 + 标题 + 来源·时间·类型 + ★ 评级徽章，A股红涨绿跌）
 * - 置顶洞见卡（为什么 + 后续预判）
 * - AiAnalysisSection 编号圆步骤 + 各业务子组件
 *   （InvestmentSummaryCard / AiEventUnderstanding / AiTransmissionAnalysis / HistoryTimeline）
 * - 投资逻辑解析（InvestmentLogicHeader 无编号过渡模块，置「投资机会洞见」与「事件理解」之间）
 *
 * 流式输出（对齐 APP useAiReasoning）：数据源仍是一次性拉取，进入页面后由前端定时器编排
 * 「思考 → 逐步骤 processing → completed」，未开始的段落渐进出现。全程无 SSE / 无后端改动。
 * 时序结束后由 scroll-spy 接管步骤高亮（见 updateActiveStep）。
 *
 * 数据源：detail = eventAdapter.adaptEventDetail 输出（与 APP 同源 analysis_reports）。
 */
import AiAnalysisSection from './AiAnalysisSection.vue'
import InvestmentSummaryCard from './InvestmentSummaryCard.vue'
import InvestmentLogicHeader from './InvestmentLogicHeader.vue'
import AiEventUnderstanding from './AiEventUnderstanding.vue'
import AiTransmissionAnalysis from './transmission/AiTransmissionAnalysis.vue'
import HistoryTimeline from './HistoryTimeline.vue'
import { Loading } from '@element-plus/icons-vue'
import { computed, ref, reactive, nextTick, onMounted, onBeforeUnmount } from 'vue'

export default {
  name: 'AiEventReport',
  components: {
    AiAnalysisSection,
    InvestmentSummaryCard,
    InvestmentLogicHeader,
    AiEventUnderstanding,
    AiTransmissionAnalysis,
    HistoryTimeline,
    Loading,
  },
  props: {
    detail: { type: Object, default: null },
  },
  emits: ['back'],
  setup(props) {
    // 顶部步骤轨（5 步，与报告实际段落一一对应）
    const stepItems = [
      { key: 'insight', label: '洞见事件' },
      { key: 'investment', label: '投资机会洞见' },
      { key: 'understanding', label: '事件理解' },
      { key: 'transmission', label: '事件影响传导推理' },
      { key: 'history', label: '历史验证' },
    ]

    /** 该步骤在后端报告里是否有内容（无内容的步骤不参与流式时序，保持 pending） */
    function hasContent(key) {
      const d = props.detail
      if (!d) return false
      if (key === 'insight') return !!d.investmentSummary
      if (key === 'investment') return !!d.investmentSummary
      if (key === 'understanding') return !!d.eventUnderstanding
      if (key === 'transmission') return !!d.transmissionAnalysis
      if (key === 'history') return !!(d.historyEvents?.length)
      return false
    }

    // ========== 流式时序（镜像 APP useAiReasoning：思考 → 逐步骤 processing → completed） ==========
    // 数据仍是一次性拉取，「流式」由前端定时器编排，与 APP 行为一致；无 SSE、无后端改动。
    const stepState = reactive({}) // key -> 'pending' | 'processing' | 'completed'
    const streamDone = ref(false)
    /** 当前所处步骤：流式期间由时序驱动，流式结束后交由 scroll-spy 驱动 */
    const activeStep = ref(stepItems[0].key)

    const stepStatus = (key) => stepState[key] || 'pending'
    /** 已开始处理的步骤（用于渐进出现） */
    const isVisible = (key) => stepStatus(key) !== 'pending'

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    // 卸载后停止推进，避免对已销毁组件写状态
    let unmounted = false

    async function startStreaming() {
      if (!props.detail) return
      stepItems.forEach((s) => { stepState[s.key] = 'pending' })

      const sequence = stepItems.filter((s) => hasContent(s.key)).map((s) => s.key)
      if (!sequence.length) {
        streamDone.value = true
        attachScrollSpy()
        return
      }

      await delay(600) // 思考阶段（对齐 APP runThinkingPhase）
      if (unmounted) return

      for (const key of sequence) {
        activeStep.value = key
        stepState[key] = 'processing'
        await delay(400 + Math.random() * 200) // 对齐 APP：伪流式随机 400~600ms
        if (unmounted) return
        stepState[key] = 'completed'
        await delay(300) // 对齐 APP：步骤间隔 300ms
        if (unmounted) return
      }

      streamDone.value = true
      attachScrollSpy()
    }

    // 评级徽章文案（对齐 APP：★ 前缀）
    const ratingLabel = computed(() => {
      const rating = props.detail?.investmentSummary?.rating
      if (rating === 'positive') return '★ 整体偏积极'
      if (rating === 'negative') return '★ 整体偏谨慎'
      return '★ 整体中性'
    })

    const logicReady = computed(() => !!props.detail?.investmentSummary?.keyPoints?.length)

    /** 洞见卡（置顶）：为什么 + 后续预判。数据源与 APP 一致 */
    const insightCard = computed(() => {
      const s = props.detail?.investmentSummary
      if (!s) return { content: '', trace: '', forecast: '' }
      const trace = s.keyPoints?.[0] || s.conclusion || ''
      const forecast = s.focusIndustries?.[0]?.reason
        || s.opportunities?.[0]
        || s.risks?.[0]
        || ''
      return { content: s.conclusion || '', trace, forecast }
    })

    function formatTime(time) {
      if (!time) return ''
      const d = new Date(time)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    // ========== 步骤轨 scroll-spy：滚到哪一段就点亮哪一步 ==========
    const activeIndex = computed(() => {
      const i = stepItems.findIndex((s) => s.key === activeStep.value)
      return i < 0 ? 0 : i
    })
    /** 该步之前的连线点亮，形成进度感 */
    function isPassed(idx) {
      return idx < activeIndex.value
    }

    /** 侧栏步骤点击：锚点滚动到对应分析段落（窄屏横向步骤条同样适用） */
    function scrollToStep(key) {
      // 立即点亮，避免等待平滑滚动结束
      activeStep.value = key
      document.getElementById(`step-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    /** 判定线（视口坐标）：页头下方，与 .report-rail 的 top 及 scroll-margin-top 保持一致 */
    const SPY_LINE = 120

    /**
     * 当前步骤 = 最后一个已越过判定线的段落。
     * 用位置判定而非 IntersectionObserver 可见集合：快速滚动/跳转时结果确定，不会残留过期状态。
     *
     * 边界处理：末段后面的内容不足一屏时，滚到页面底部它的顶部也越不过判定线，会一直停在
     * 倒数第二步。因此额外判断——当"剩余可滚动距离"小于末段与判定线的差距时，视为已进入末段。
     */
    function updateActiveStep() {
      const items = stepItems
        .map((s) => ({ key: s.key, el: document.getElementById(`step-${s.key}`) }))
        .filter((it) => it.el)
      if (!items.length) return

      let current = items[0].key
      items.forEach((it) => {
        if (it.el.getBoundingClientRect().top <= SPY_LINE) current = it.key
      })

      const last = items[items.length - 1]
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight
      const lastTopDoc = last.el.getBoundingClientRect().top + window.scrollY
      const tailGap = lastTopDoc - maxScrollY - SPY_LINE // >0 表示滚到底也够不到判定线
      if (tailGap > 0 && maxScrollY - window.scrollY <= tailGap + 2) {
        current = last.key
      }

      activeStep.value = current
    }

    /** 流式结束后接管：此时所有段落都已渲染，位置判定才准确 */
    function attachScrollSpy() {
      updateActiveStep()
      window.addEventListener('scroll', updateActiveStep, { passive: true })
      window.addEventListener('resize', updateActiveStep, { passive: true })
    }

    onMounted(() => {
      nextTick(startStreaming)
    })
    onBeforeUnmount(() => {
      unmounted = true
      window.removeEventListener('scroll', updateActiveStep)
      window.removeEventListener('resize', updateActiveStep)
    })

    return {
      stepItems,
      stepStatus,
      isVisible,
      streamDone,
      logicReady,
      ratingLabel,
      insightCard,
      formatTime,
      scrollToStep,
      activeStep,
      isPassed,
    }
  },
}
</script>

<style lang="scss" scoped>
.ai-event-report {
  padding-bottom: 24px;
}

/* ===== 布局：窄屏单列（步骤条在顶）→ ≥1200px 左侧竖向步骤轨 + 主栏 ===== */
.report-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-main {
  min-width: 0;
}

.report-rail {
  min-width: 0;
}

/* ===== 窄屏：顶部横向胶囊步骤条（保持原样式），当前步点亮 ===== */
.rail-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--ev-bg-page);
  border-radius: var(--ev-r-md);
  overflow-x: auto;
}

.rail-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: var(--ev-r-full);
  background: var(--ev-bg-card);
  border: 1px solid var(--ev-line);
  white-space: nowrap;
}

.rail-node {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
}

/* 竖向连接线：仅宽屏步骤轨启用 */
.rail-node-line {
  display: none;
}

/* 无边序号，只有圆点：靠颜色区分状态 */
.rail-node-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ev-bg-deep);
}

.rail-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ev-text-muted);
}

/* 步骤处理中：步骤轨上的转圈（宽屏显示在标签右侧） */
.rail-loading {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ev-accent);
}

/* 已完成的步骤：白心蓝环 */
.rail-step.is-done .rail-node-dot {
  background: var(--ev-bg-card);
  box-shadow: inset 0 0 0 2px var(--ev-accent);
}

/* 当前步骤：点亮（实心蓝 + 蓝字） */
.rail-step.is-active {
  background: var(--ev-accent-soft);
  border-color: var(--ev-accent);
}

.rail-step.is-active .rail-node-dot {
  background: var(--ev-accent);
  box-shadow: none;
}

.rail-step.is-active .rail-label {
  color: var(--ev-accent);
}

/* ===== ≥1200px：左侧粘性竖向步骤轨（断点需与 EventDetailView.vue 一致） ===== */
@media (min-width: 1200px) {
  .report-layout {
    display: grid;
    grid-template-columns: var(--ev-rail-w) minmax(0, 1fr);
    grid-template-areas: 'rail main';
    gap: var(--ev-rail-gap);
    align-items: start;
  }

  .report-main {
    grid-area: main;
  }

  .report-rail {
    grid-area: rail;
    /* 粘性定位：让开固定导航栏(60px) + 粘性页头(44px) */
    position: sticky;
    top: 120px;
  }

  /* 宽屏去掉胶囊与卡片外框，只留一条竖向步骤轨 */
  .rail-nav {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0;
    background: transparent;
    border-radius: 0;
    overflow: visible;
  }

  .rail-step {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
    padding: 0 0 20px;
    border: none;
    border-radius: 0;
    background: transparent;
    cursor: pointer;
  }

  .rail-step:last-child {
    padding-bottom: 0;
  }

  .rail-step:hover .rail-label {
    color: var(--ev-text-primary);
  }

  /* 节点列撑满行高，连接线才能连续贯通到下一步 */
  .rail-node {
    align-self: stretch;
    height: auto;
  }

  /* 连接线：从本节点圆心贯通到下一节点圆心（-20px 为 .rail-step 的下间距） */
  .rail-node-line {
    display: block;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 50%;
    bottom: calc(-20px - 50%);
    width: 2px;
    background: var(--ev-line);
  }

  .rail-step:last-child .rail-node-line {
    display: none;
  }

  /* 已走过的连线点亮，形成进度感 */
  .rail-step.is-passed .rail-node-line {
    background: var(--ev-primary);
  }

  .rail-step.is-done .rail-node-dot {
    background: var(--ev-bg-card);
    box-shadow: inset 0 0 0 2px var(--ev-primary);
  }

  /* 当前步骤：实心品牌蓝 + 光晕，明确"点亮" */
  .rail-step.is-active .rail-node-dot {
    background: var(--ev-primary);
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12), 0 2px 8px rgba(11, 95, 255, 0.25);
  }

  /* 文字权重高于圆点：14px / 20px 行高，与正文基准一致 */
  .rail-label {
    font-size: 14px;
    line-height: 20px;
    font-weight: 500;
    color: var(--ev-text-secondary);
    text-align: left;
    transition: color 0.15s ease;
  }

  .rail-step.is-active .rail-label {
    color: var(--ev-primary);
    font-weight: 600;
  }
}

/* 锚点滚动时避开固定导航栏 + 粘性页头 */
.ai-event-report .hero-card,
.ai-event-report :deep(.analysis-section) {
  scroll-margin-top: 120px;
}

/* ===== Hero 卡：白底 + 左侧蓝色竖条（对齐 APP hero-bar）= =====
 * 内边距/间距对齐 APP：24rpx 28rpx 22rpx 36rpx → 12px 14px 11px 18px */
.hero-card {
  position: relative;
  background: var(--ev-bg-card);
  border: 1px solid var(--ev-line);
  border-radius: var(--ev-r-md);
  padding: 12px 14px 11px 18px; /* 左侧预留竖条空间 */
  margin-bottom: 12px;
  overflow: hidden;
}

.hero-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--ev-primary);
}

.hero-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--ev-text-primary);
  line-height: 1.4;
  margin-bottom: 6px; /* APP 12rpx */
}

.hero-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px; /* APP 6rpx */
  font-size: 11px; /* APP 各 meta 子项均为 22rpx */
}

.meta-label { color: var(--ev-text-muted); flex-shrink: 0; }
.meta-link { color: var(--ev-primary); text-decoration: none; }
.meta-link:hover { text-decoration: underline; }
/* 来源文字：统一为蓝色（对齐事件类型色），无链接时也保持蓝 */
.meta-source { color: var(--ev-primary); }
.meta-unverified { font-style: italic; color: var(--ev-text-muted); opacity: 0.7; }
.meta-dot { color: var(--ev-text-muted); }
.meta-time { color: var(--ev-text-muted); }
.meta-type { color: var(--ev-primary); }

/* 评级徽章：A股红涨绿跌 + ★ 前缀（内边距/字号/上间距对齐 APP 6rpx 18rpx / 22rpx / 16rpx） */
.hero-rating {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px 9px;
  border-radius: var(--ev-r-full);
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
}

.rating-positive {
  background: var(--ev-negative-soft);
  border: 1px solid var(--ev-negative-soft);
  color: var(--ev-negative);
}
.rating-negative {
  background: var(--ev-positive-soft);
  border: 1px solid var(--ev-positive-soft);
  color: var(--ev-positive);
}
.rating-neutral {
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: var(--ev-text-tertiary); /* 对齐 APP：neutral 用 tertiary(=#4b5a7a)，非 muted */
}

/* ===== 洞见卡（置顶）：白卡 + 洞见字标·类型词 + 结论标题 + 渐变分隔线 + 溯源蓝子卡 + 预判浅中子卡（镜像 APP InsightCard） ===== */
.insight-card {
  display: flex;
  flex-direction: column;
  gap: var(--ev-s-2);
  background: var(--ev-bg-card);
  border: 1px solid var(--ev-line);
  border-radius: var(--ev-r-lg);
  box-shadow: var(--ev-shadow-xs);
  padding: 16px;
  margin-bottom: 12px; /* APP 24rpx */
}

/* 洞见卡分析中占位：与 AiAnalysisSection 的 processing 态同语言（转圈 + AI开始分析…） */
.insight-card.is-streaming {
  flex-direction: row;
  align-items: center;
  gap: var(--ev-s-2);
}

.stream-spinner {
  font-size: 14px;
  color: var(--ev-accent);
}

.stream-hint {
  font-size: var(--ev-font-md);
  color: var(--ev-text-muted);
}

.insight-head {
  display: flex;
  align-items: center;
  gap: 4px; /* APP 8rpx */
}

.insight-wordmark {
  flex-shrink: 0;
  width: 58px;
  height: 40px;
  background-image: url('@/assets/insight-wordmark.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  filter: drop-shadow(2px 3px 6px rgba(10, 46, 111, 0.25));
}

.wm-dot {
  font-size: 13px; /* APP 26rpx */
  color: var(--ev-text-muted);
  line-height: 1;
}

.wm-label {
  font-size: 13px; /* APP $font-size-base 26rpx */
  font-weight: 700;
  line-height: 1;
  color: #00a8d8; /* event 主色（镜像 APP InsightCard type=event） */
}

.insight-title {
  font-size: var(--ev-font-md); /* APP $font-size-md 28rpx → 14px */
  font-weight: 600;
  color: var(--ev-text-primary);
  line-height: 1.25; /* APP $lh-tight */
}

.insight-divider {
  height: 1px;
  background: linear-gradient(90deg, var(--ev-primary-100), rgba(214, 230, 255, 0));
  margin: 4px 0;
}

/* 双子卡：溯源=冷雾蓝 / 预判=浅中性（镜像 APP InsightCard 色板；内边距对齐 APP 16rpx 20rpx） */
.insight-line {
  border-radius: var(--ev-r-md);
  padding: 8px 10px;
}

.insight-key {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 4px; /* APP 8rpx */
}

.insight-text {
  display: block;
  font-size: var(--ev-font-sm);
  line-height: 1.5; /* APP $lh-base */
  color: #5e6673;
}

.insight-line.is-trace {
  background: #f4f8fe;
  border: 1px solid #dce7f8;
}
.insight-line.is-trace .insight-key { color: #4a6fbf; }

.insight-line.is-forecast {
  background: #f7f8fb;
  border: 1px solid #e3e6ec;
}
.insight-line.is-forecast .insight-key { color: #181b22; }

/* 底部：镜像 APP footer-text 弱字色 #8a96b0 */
.report-footer { padding: 8px 0 0; }
.report-footer :deep(.el-alert__content),
.report-footer :deep(.el-alert__icon) {
  color: var(--ev-text-muted);
  font-size: 12px;
}
.report-footer :deep(.el-alert) {
  background: transparent;
  border: none;
  padding: 0;
  justify-content: center;
  --el-alert-bg-color: transparent;
}
</style>