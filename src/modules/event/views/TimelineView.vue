<template>
  <div class="timeline-page">
    <div class="page-content">
      <!-- 页头：标题 + 返回事件列表入口 -->
      <div class="page-header">
        <h2 class="section-title">重大事件时间线</h2>
        <router-link class="back-link" :to="{ name: 'eventList' }">返回事件列表</router-link>
      </div>

      <!-- 首屏加载（无任何内容时） -->
      <div v-if="loading && items.length === 0" class="state-container">
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
        <span class="state-text">加载中...</span>
      </div>

      <!-- 空状态 -->
      <el-empty v-else-if="isEmpty" description="暂无事件数据">
        <el-button type="primary" @click="refresh">刷新</el-button>
      </el-empty>

      <!-- 错误状态 -->
      <el-result v-else-if="error" icon="error" title="加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="refresh">重试</el-button>
        </template>
      </el-result>

      <!-- 事件时间线列表（仿韭研公社 /timeline：左侧竖线 + 圆点节点 + 日期分组头 + 无边框事件行） -->
      <template v-else>
        <div class="timeline-list">
          <!-- 竖向时间线 -->
          <div class="tl-line" />

          <div v-for="group in groupedItems" :key="group.date" class="time-item">
            <!-- 日期分组头：MM-DD 周X + 相对标签 -->
            <div class="time-header">
              <span class="tl-dot" />
              <span class="date">{{ formatDateDisplay(group.date) }}</span>
              <span class="weekday">{{ weekdayOf(group.date) }}</span>
              <span
                v-if="relativeTag(group.date)"
                class="date-tag"
                :class="'date-tag--' + relativeTag(group.date)"
              >{{ relativeText(group.date) }}</span>
            </div>

            <!-- 分组内事件行 -->
            <div
              v-for="event in group.events"
              :key="event.eventId"
              class="time-article-item"
              :class="{ 'time-article-item--expanded': expandedId === event.eventId }"
              @click="handleEventClick(event)"
            >
              <!-- 第一行：标题（完整显示，核心影响板块紧跟标题文字末尾） -->
              <div class="item-top">
                <!-- 重大事件（五星 importance===5 或 GI 进当日双榜单）→ 红色渐变胶囊「重大」+ 白色实心火焰
                     （与 APP SvgIcon fire-fill 同一几何，1024 viewBox 白色火焰，红胶囊底同款渐变） -->
                <span v-if="isMajorEvent(event)" class="major-badge" aria-label="重大事件">
                  <svg class="major-badge__flame" width="13" height="13" viewBox="0 0 1024 1024" fill="none" aria-hidden="true">
                    <path
                      d="M512 981.333333a320 320 0 0 1-219.221333-553.088C350.037333 374.357333 490.666667 277.333333 469.333333 64c256 170.666667 384 341.333333 128 597.333333 42.666667 0 106.666667 0 213.333334-105.386666 11.52 32.981333 21.333333 68.437333 21.333333 105.386666A320 320 0 0 1 512 981.333333z"
                      fill="#ffffff"
                    />
                  </svg>
                  <span class="major-badge__text">重大</span>
                </span>
                <!-- 财报披露行蓝色胶囊「财报」（与「重大」胶囊同位，二者互斥） -->
                <span v-if="event.isDisclosure" class="report-badge" aria-label="财报披露">
                  <span class="report-badge__text">财报</span>
                </span>
                <span class="title" :class="{ 'title--major': isMajorEvent(event) }">{{ event.title }}</span>
                <!-- 影响板块：历史行取 chain_summary[0] 最核心 1 个，按方向着色（A 股红涨绿跌：bullish=红/bearish=绿/neutral=灰）、无底色；
                     未来行使链方向数据 → sectorDirection=null → 回退中性灰 -->
                <span
                  v-if="event.sectorName"
                  class="sector-tag"
                  :class="event.sectorDirection === 'bullish' || event.sectorDirection === 'bearish' ? 'sector-tag--' + event.sectorDirection : 'sector-tag--neutral'"
                >{{ event.sectorName }}</span>
              </div>

              <!-- 摘要（历史行 summary 恒空串 → 不渲染；仅未来行非空时渲染） -->
              <div v-if="event.summary" class="summary">{{ event.summary }}</div>

              <!-- 展开区域（未来行点击就地展开；历史行恒跳详情，不会走到此处） -->
              <div v-if="expandedId === event.eventId && event.isFuture" class="event-expand">
                <span class="expand-text">事件尚未发生，暂无传导分析</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div class="load-more-area">
          <el-button v-if="loadingMore" loading>加载中...</el-button>
          <el-button v-else-if="hasMore" @click="loadMore">加载更多</el-button>
          <el-button v-else-if="items.length > 0" text class="done-text">— 已加载全部 {{ items.length }} 条事件 —</el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
/**
 * 重大事件时间线页面（Web 端，对齐 APP aistock-app-frontend .../pages/event/timeline.vue）
 *
 * 仿韭研公社 /timeline 排版：左侧竖向时间线（竖线 + 蓝色圆点节点）+ 日期分组头 + 无边框紧凑事件行。
 * 单一时间轴，不区分未来/历史 Tab。窗口覆盖 [今天-30, 今天+90]，日期升序。
 * 数据源双轨：
 *  - 历史段（date ≤ 今天）：事件传导列表（getTimelineHistoryRows，星级 ≥4 且非纯行情，date 按传导时间 publishTime 前 10 位分组）
 *  - 未来段（date > 今天）：GET /api/agent/event/timeline 实体源（scheduled/upcoming/ongoing 原样展示）
 * 重大事件（五星 importance===5 或 GI 进当日双榜单）标题前置「重大」胶囊徽标 + 加粗、
 * 行业方向胶囊红绿灰着色（无底色）只作用于传导历史段。
 * 历史行点击恒跳详情（这类事件必有传导报告），未来行就地展开。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { getEventTimeline } from '@/modules/event/api/eventApi'
import { getEntityRows, getTimelineHistoryRows } from '@/modules/event/api/eventService'

export default {
  name: 'TimelineView',
  components: { Loading },
  setup() {
    const router = useRouter()

    // ========== 获取今天日期（本地，历史段上界足够） ==========
    const now = new Date()
    const todayStr = dateStrOf(now)

    // 明天
    const tomorrowDate = new Date(now)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowStr = dateStrOf(tomorrowDate)

    // 未来 90 天后
    const futureDate = new Date(now)
    futureDate.setDate(futureDate.getDate() + 90)
    const futureStr = dateStrOf(futureDate)

    // 30 天前
    const pastDate = new Date(now)
    pastDate.setDate(pastDate.getDate() - 30)
    const pastStr = dateStrOf(pastDate)

    /** 本地 Date → YYYY-MM-DD */
    function dateStrOf(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    // ========== 状态 ==========
    // 统一行视图（TimelineRow）：历史段来自传导源、未来段来自实体源，合并后统一分组渲染
    const items = ref([])
    const loading = ref(false)
    const loadingMore = ref(false)
    const error = ref('')
    const total = ref(0)
    const hasMore = ref(false)
    const page = ref(1)
    const pageSize = 20
    const expandedId = ref(null)

    /**
     * 重大事件判定：五星（importance===5，最高星级）或 GI 事件（进了当日双榜单）→ 显示「重大」胶囊 + 标题加粗。
     * 未来行恒无星级且 isGi=false → 不触发。
     */
    function isMajorEvent(event) {
      return event.importance === 5 || event.isGi
    }

    // ========== 计算属性 ==========
    const isEmpty = computed(() => !loading.value && items.value.length === 0 && !error.value)

    /**
     * 按 date 分组，组间升序（旧 → 新），组内按 eventStartTime 升序。
     */
    const groupedItems = computed(() => {
      const groups = new Map()
      for (const item of items.value) {
        const list = groups.get(item.date) || []
        list.push(item)
        groups.set(item.date, list)
      }

      // 组内排序
      for (const events of groups.values()) {
        events.sort((a, b) => String(a.eventStartTime).localeCompare(String(b.eventStartTime)))
      }

      // 组间排序：升序
      const sortedDates = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b))

      return sortedDates.map((date) => ({ date, events: groups.get(date) }))
    })

    // ========== 方法 ==========

    /** 单窗口查询参数：过去 30 天 → 未来 90 天，升序 */
    function timelineQuery(pageNum) {
      return {
        dateFrom: pastStr,
        dateTo: futureStr,
        order: 'asc',
        page: pageNum,
        pageSize,
      }
    }

    /** 刷新（首次加载 / 重试） */
    async function refresh() {
      // 并发去重：加载中直接返回（对齐事件列表页的不可重入约定）
      if (loading.value) return
      loading.value = true
      error.value = ''
      page.value = 1
      items.value = []

      try {
        // 并行拉取双源：实体源（窗口分页）+ 事件传导历史源（星级 ≥4 且非纯行情，一次拉完）
        const [timelineRes, historyRows] = await Promise.all([
          getEventTimeline(timelineQuery(1)),
          getTimelineHistoryRows({ earliestDate: pastStr }),
        ])

        // 合并规则：实体行只保留 date > 今天，历史段完全交给传导源（传导源已过滤 date ≤ 今天）
        const entityRows = getEntityRows(timelineRes.items).filter((r) => r.date > todayStr)
        items.value = [...historyRows, ...entityRows]

        // 底部「加载更多」只作用于实体源
        total.value = timelineRes.total
        hasMore.value = timelineRes.hasMore
        page.value = 1
      } catch (e) {
        error.value = e?.message || '加载失败，请稍后重试'
      } finally {
        loading.value = false
      }
    }

    /** 加载更多 */
    async function loadMore() {
      if (loadingMore.value || !hasMore.value) return
      loadingMore.value = true

      try {
        const nextPage = page.value + 1
        const res = await getEventTimeline(timelineQuery(nextPage))
        // 加载更多只作用于实体源的未来段（历史段已由传导源一次拉完）
        const newEntityRows = getEntityRows(res.items).filter((r) => r.date > todayStr)
        // 去重：已加载的 eventId 不重复添加
        const existingIds = new Set(items.value.map((i) => i.eventId))
        const newItems = newEntityRows.filter((i) => !existingIds.has(i.eventId))
        items.value = [...items.value, ...newItems]
        total.value = res.total
        hasMore.value = res.hasMore
        page.value = nextPage
      } catch (e) {
        error.value = e?.message || '加载失败'
      } finally {
        loadingMore.value = false
      }
    }

    /** 事件点击处理：历史行（isFuture=false）必跳详情；未来行就地展开 */
    function handleEventClick(event) {
      // 历史行（≥4 星且非纯行情的过去事件）必有传导报告 → 恒跳详情页
      if (!event.isFuture) {
        router.push({ name: 'eventDetail', params: { id: event.eventId } })
        return
      }

      // 未来行 → 就地展开/收起
      expandedId.value = expandedId.value === event.eventId ? null : event.eventId
    }

    /** 格式化日期分组显示：韭研风格 MM-DD */
    function formatDateDisplay(dateStr) {
      const parts = String(dateStr || '').split('-')
      if (parts.length === 3) {
        return `${parts[1]}-${parts[2]}`
      }
      return dateStr
    }

    /** 日期 → 星期中文（date 为后端上海时区 YYYY-MM-DD，仅展示用，不做分组键） */
    function weekdayOf(dateStr) {
      const d = new Date(`${dateStr}T00:00:00`)
      return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
    }

    /** 相对日期标签 key：只保留今天/明天 */
    function relativeTag(dateStr) {
      if (dateStr === todayStr) return 'today'
      if (dateStr === tomorrowStr) return 'tomorrow'
      return null
    }

    /** 相对日期标签文案 */
    function relativeText(dateStr) {
      if (dateStr === todayStr) return '今天'
      if (dateStr === tomorrowStr) return '明天'
      return ''
    }

    // ========== 生命周期 ==========
    onMounted(refresh)

    return {
      items,
      loading,
      loadingMore,
      error,
      total,
      hasMore,
      isEmpty,
      groupedItems,
      expandedId,
      refresh,
      loadMore,
      handleEventClick,
      formatDateDisplay,
      weekdayOf,
      relativeTag,
      relativeText,
      isMajorEvent,
    }
  },
}
</script>

<style scoped lang="scss">
.timeline-page {
  min-height: 100vh;
  /* 让位全站固定导航栏（TheNavbar: fixed / 60px），否则页头被其遮挡 */
  padding-top: 60px;
  background: #eef3fb; /* 对齐 APP $bg-page，蓝色金融系统页底 */
}

/* 阅读栏：单列居中限宽（时间线是线性流，用阅读栏宽而非列表页卡片流宽） */
.page-content {
  width: 100%;
  max-width: calc(var(--ev-content-w) + var(--ev-content-pad) * 2);
  margin: 0 auto;
  padding: 24px var(--ev-content-pad);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.back-link {
  font-size: 13px;
  color: var(--ev-accent);
}

/* ===== 时间线列表（左侧竖线 + 内容缩进；APP rpx ÷2 换算为 px：缩进 96rpx→48、竖线 64rpx→32、圆点 -40rpx→-20） ===== */
.timeline-list {
  position: relative;
  padding-left: 48px;
}

/* 竖向时间线：贯穿整列 */
.tl-line {
  position: absolute;
  left: 32px;
  /* 竖线从首个圆点中心开始（首个 .time-header 高 24px，圆点 top:50% → 中心在 12px） */
  top: 12px;
  bottom: 0;
  width: 1px;
  background: var(--ev-accent);
}

/* ===== 日期分组头（韭研：MM-DD 周X，17px 深色） ===== */
.time-item {
  margin-bottom: 20px;
}

.time-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  margin-bottom: 8px;
}

/* 圆点节点：8px 圆形，居中于竖线。竖线 left:32px（宽 1px，中心 32.5px）；
   圆点相对内容区（padding-left 48px）偏移 -20px → 左缘 28px、中心 32px ≈ 竖线中心 */
.tl-dot {
  position: absolute;
  left: -20px;
  top: 50%;
  width: 8px;
  height: 8px;
  margin-top: -4px;
  border-radius: 50%;
  background: var(--ev-accent);
}

.date {
  font-size: 17px;
  color: var(--ev-text-primary);
  font-weight: 500;
}

.weekday {
  font-size: 13px;
  color: var(--ev-text-secondary);
}

.date-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.date-tag--today {
  background: var(--ev-accent);
  color: #ffffff;
}

.date-tag--tomorrow {
  background: var(--ev-accent-soft);
  color: var(--ev-accent);
}

/* ===== 事件行（韭研：无卡片背景/边框，紧凑行） ===== */
.time-article-item {
  margin-bottom: 15px;
  padding-left: 2px;
  cursor: pointer;
}

.time-article-item:active {
  opacity: 0.7;
}

.time-article-item--expanded .title {
  color: var(--ev-accent);
}

.item-top {
  /* 块级容器：标题与影响板块在同一 inline 流，板块紧跟标题最后一个字 */
  display: block;
}

.title {
  display: inline;
  font-size: 14px; /* APP 28rpx，对齐事件传导页标题字号 */
  font-weight: 600;
  color: var(--ev-text-primary);
  line-height: 20px;
  /* 标题完整显示（可换行）；行业标签紧跟文字末尾 */
  white-space: normal;
  word-break: break-all;
}

/* 重大事件（五星 importance===5 或 GI 进当日双榜单）：标题比普通事件更粗更黑 */
.title--major {
  font-weight: 700;
  color: #000000;
}

/* 重大事件红色渐变胶囊「重大」+ 白色实心火焰（与 APP 同款红渐变 + 白色火焰） */
.major-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  vertical-align: middle;
  margin-right: 4px;
  padding: 0 6px;
  border-radius: 4px;
  background: linear-gradient(180deg, #e22c2c, #d81f1f);
}

.major-badge__flame {
  flex-shrink: 0;
}

.major-badge__text {
  font-size: 10px;
  color: #ffffff;
  font-weight: 600;
  line-height: 17px;
  white-space: nowrap;
}

/* 财报披露行蓝色胶囊「财报」（主题色实心，与红色「重大」胶囊同位互斥） */
.report-badge {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-right: 4px;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--ev-accent);
}

.report-badge__text {
  font-size: 10px;
  color: #ffffff;
  font-weight: 600;
  line-height: 17px;
  white-space: nowrap;
}

/* 核心影响板块标签（紧跟标题文字末尾，inline 胶囊） */
.sector-tag {
  display: inline-block;
  vertical-align: middle;
  margin-left: 5px;
  font-size: 10px;
  line-height: 17px;
  padding: 0 6px;
  border-radius: 4px;
  white-space: nowrap;
}

/* 行业方向着色（A 股红涨绿跌，必须用全局 --ev-* 变量，禁止硬编码色值）。
   三种方向都【无底色】（inline 胶囊只靠字色区分），不设 background。 */
.sector-tag--bullish {
  color: var(--ev-negative);
}

.sector-tag--bearish {
  color: var(--ev-positive);
}

/* neutral 默认灰色字（--ev-text-muted） */
.sector-tag--neutral {
  color: var(--ev-text-muted);
}

.summary {
  font-size: 12px;
  color: var(--ev-text-muted);
  line-height: 1.5;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}

/* ===== 展开区域 ===== */
.event-expand {
  margin-top: 6px;
  padding: 7px 8px;
  background: var(--ev-accent-bg);
  border-radius: 4px;
}

.expand-text {
  font-size: 12px;
  color: var(--ev-text-tertiary);
  line-height: 1.5;
  display: block;
}

/* ===== 加载更多 / 状态区域 ===== */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  gap: 16px;
}

.state-text {
  font-size: 14px;
  color: #6b7280;
}

.load-more-area {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.done-text {
  color: var(--ev-text-muted);
}

/* 响应式：小屏收窄呼吸位 */
@media (max-width: 768px) {
  .page-content {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
