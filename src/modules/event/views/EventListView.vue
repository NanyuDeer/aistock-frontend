<template>
  <div class="event-list-page">
    <div class="page-content">
      <!-- AI关注焦点区域 -->
      <div class="ai-focus-section">
        <h2 class="section-title">重大事件</h2>
        <div class="headline-cards">
          <EventHeadlineCard
            v-if="headlineEvents.positive"
            type="positive"
            :title="headlineEvents.positive.title"
            :importance="headlineEvents.positive.importance"
            :industries="headlineEvents.positive.affectedIndustries ?? []"
            :event-id="headlineEvents.positive.eventId"
            :source-url="headlineEvents.positive.sourceInfo?.url"
            @click="handleHeadlineClick"
          />
          <EventHeadlineCard
            v-if="headlineEvents.negative"
            type="negative"
            :title="headlineEvents.negative.title"
            :importance="headlineEvents.negative.importance"
            :industries="headlineEvents.negative.affectedIndustries ?? []"
            :event-id="headlineEvents.negative.eventId"
            :source-url="headlineEvents.negative.sourceInfo?.url"
            @click="handleHeadlineClick"
          />
        </div>
      </div>

      <!-- 分类Tab -->
      <div class="filter-section">
        <el-radio-group v-model="activeType" @change="handleFilterChange" size="small">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button v-for="type in EVENT_TYPES" :key="type" :label="type">{{ type }}</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 加载中 -->
      <div v-if="loading && events.length === 0" class="state-container">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
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

      <!-- 事件列表 -->
      <template v-else>
        <div class="event-list">
          <EventItemCard
            v-for="event in events"
            :key="event.eventId"
            :event="event"
            @view-detail="goToDetail"
            @view-news="goToNews"
            @toggle-follow="handleFollow"
          />
        </div>

        <!-- 分页 -->
        <div class="pagination-section" v-if="total > pageSize">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>

        <!-- 加载更多（备选方案） -->
        <div class="load-more-area" v-if="hasMore && total <= pageSize">
          <el-button v-if="loading" loading>加载中...</el-button>
          <el-button v-else @click="loadMore">加载更多 (剩余 {{ total - events.length }} 条)</el-button>
        </div>
        <div class="load-done" v-else-if="events.length > 0 && !hasMore">
          <el-divider>已加载全部 {{ total }} 条事件</el-divider>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
/**
 * 事件传导列表页
 *
 * 展示 AI 事件影响链分析，支持：
 * - AI 今日精选
 * - 分类筛选
 * - 分页加载
 * - 关注事件
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import EventItemCard from '../components/EventItemCard.vue'
import EventHeadlineCard from '../components/EventHeadlineCard.vue'
import { getEventList, followEvent, unfollowEvent } from '@/modules/event/api/eventApi'
import { getFocusEvents } from '@/modules/event/api/eventService'
import { EVENT_TYPES } from '@/modules/event/constants'

export default {
  name: 'EventListView',
  components: {
    EventItemCard,
    EventHeadlineCard,
    Loading,
  },
  setup() {
    const router = useRouter()

    // ========== 焦点事件（真实 Global Importance 双榜单） ==========
    const headlineEvents = reactive({
      positive: null,
      negative: null,
    })

    async function loadFocus() {
      try {
        const focus = await getFocusEvents()
        // 左卡=利好（positive），右卡=利空（negative）；忽略 mixed
        headlineEvents.positive = focus.find((e) => e.direction === 'positive') || null
        headlineEvents.negative = focus.find((e) => e.direction === 'negative') || null
      } catch (err) {
        console.error('[EventListView] 加载焦点事件失败:', err)
      }
    }

    // ========== 列表数据 ==========
    const events = ref([])
    const loading = ref(false)
    const error = ref('')
    const total = ref(0)
    const currentPage = ref(1)
    const pageSize = ref(10)
    const hasMore = ref(false)
    const activeType = ref('')

    // 是否为空
    const isEmpty = computed(() => !loading.value && events.value.length === 0 && !error.value)

    // ========== 数据加载 ==========
    async function fetchEvents(page = 1) {
      loading.value = true
      error.value = ''

      try {
        const params = {
          page,
          pageSize: pageSize.value,
        }
        if (activeType.value) {
          params.eventType = activeType.value
        }

        const response = await getEventList(params)
        events.value = response.events || []
        total.value = response.total || 0
        hasMore.value = response.hasMore || false
        currentPage.value = page
      } catch (err) {
        console.error('[EventListView] 加载失败:', err)
        error.value = err.message || '加载失败，请重试'
      } finally {
        loading.value = false
      }
    }

    // 刷新
    function refresh() {
      fetchEvents(1)
    }

    // 加载更多
    function loadMore() {
      if (!hasMore.value || loading.value) return
      fetchEvents(currentPage.value + 1)
    }

    // 分页切换
    function handlePageChange(page) {
      fetchEvents(page)
    }

    // 筛选切换
    function handleFilterChange(value) {
      activeType.value = value
      fetchEvents(1)
    }

    // ========== 事件处理 ==========
    // AI 今日精选卡片点击
    function handleHeadlineClick(eventId) {
      router.push({
        name: 'eventDetail',
        params: { id: eventId }
      })
    }

    // 跳转详情
    function goToDetail(event) {
      router.push({
        name: 'eventDetail',
        params: { id: event.eventId }
      })
    }

    // 跳转新闻原文
    function goToNews(event) {
      const url = event.sourceInfo?.url
      if (!url) {
        ElMessage.warning('暂无原文链接')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    // 关注/取消关注
    async function handleFollow(event) {
      try {
        await event.isFollowed ? unfollowEvent(event.eventId) : followEvent(event.eventId)
        event.isFollowed = !event.isFollowed
        ElMessage.success(event.isFollowed ? '已关注' : '已取消关注')
      } catch (err) {
        ElMessage.warning('关注功能暂未实现')
      }
    }

    // ========== 生命周期 ==========
    onMounted(() => {
      refresh()
      loadFocus()
    })

    return {
      headlineEvents,
      events,
      loading,
      error,
      total,
      currentPage,
      pageSize,
      hasMore,
      isEmpty,
      activeType,
      EVENT_TYPES,
      refresh,
      loadMore,
      handlePageChange,
      handleFilterChange,
      handleHeadlineClick,
      goToDetail,
      goToNews,
      handleFollow,
    }
  },
}
</script>

<style scoped>
.event-list-page {
  min-height: 100vh;
  /* 让位全站固定导航栏（TheNavbar: fixed / 60px），否则页头被其遮挡 */
  padding-top: 60px;
  background: #eef3fb; /* 对齐 APP $bg-page，蓝色金融系统页底 */
}

/* 卡片流栏：单列居中限宽（栏宽 = 内容宽 + 左右呼吸位）。
 * 列表页比详情页宽：≥1024px 时卡片区转两列，把横向空间用起来。 */
.page-content {
  width: 100%;
  max-width: calc(var(--ev-content-w-lg) + var(--ev-content-pad) * 2);
  margin: 0 auto;
  padding: 24px var(--ev-content-pad);
}

/* AI 关注焦点区域 */
.ai-focus-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
}

/* 焦点卡区：窄屏单列（与下方事件列表同为单列）；
 * 宽屏转双列，列宽/间距与 .event-list 完全一致——只有 1 张卡时只占左列，与事件列表左列对齐 */
.headline-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

@media (min-width: 1024px) {
  .headline-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 筛选区域：对齐 APP Segmented——浅蓝轨道 + 选中项白色胶囊。
 * 选中态不使用品牌蓝：沿用 APP 事件页对 .as-segmented__item.is-active 的覆盖（灰字 + 白色胶囊 + 加粗） */
.filter-section {
  margin-bottom: 20px;
}

.filter-section :deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  width: fit-content; /* 窄屏轨道贴合胶囊，不留大片空白轨道 */
  max-width: 100%;
  padding: 3px;
  background: var(--ev-bg-deep); /* 对齐 APP .tab-scroll #e6eef9 */
  border-radius: var(--ev-r-md);
}

.filter-section :deep(.el-radio-button + .el-radio-button) {
  margin-left: 0;
}

.filter-section :deep(.el-radio-button__inner) {
  border: none;
  border-radius: var(--ev-r-sm);
  background: transparent;
  color: var(--ev-text-secondary); /* 对齐 APP $ink-soft #4b5a7a */
  padding: 5px 14px;
  box-shadow: none;
}

.filter-section :deep(.el-radio-button__inner:hover) {
  color: var(--ev-text-primary);
}

.filter-section :deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: var(--ev-bg-card);
  color: var(--ev-text-secondary);
  font-weight: 600;
  box-shadow: var(--ev-shadow-xs);
}

/* 宽屏下胶囊横向铺满整行：原先 7 个胶囊自然宽约 550px，只占内容区（1200px）的一半，
 * 右侧留白明显。这里让每个胶囊等分剩余空间（flex-grow 摊平），轨道撑满整行。 */
@media (min-width: 1024px) {
  .filter-section :deep(.el-radio-group) {
    width: 100%;
  }

  .filter-section :deep(.el-radio-button) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .filter-section :deep(.el-radio-button__inner) {
    display: block;
    width: 100%;
  }
}

/* 事件列表（窄屏单列） */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 宽屏转两列卡片流：卡片标题/行业/AI 摘要均为定行截断，等高排列不会参差 */
@media (min-width: 1024px) {
  .event-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 16px;
  }
}

/* 状态容器 */
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

/* 分页 */
.pagination-section {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.load-more-area {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.load-done {
  padding: 24px;
}

/* 响应式：小屏收窄呼吸位（栏宽已随视口自适应） */
@media (max-width: 768px) {
  .page-content {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>