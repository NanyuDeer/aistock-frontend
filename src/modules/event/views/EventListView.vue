<template>
  <div class="event-list-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">事件传导</h1>
      <p class="page-subtitle">AI解析事件影响链，追踪产业链机会</p>
    </div>

    <div class="page-content">
      <!-- AI关注焦点区域 -->
      <div class="ai-focus-section">
        <h2 class="section-title">焦点事件</h2>
        <div class="headline-cards">
          <EventHeadlineCard
            v-if="headlineEvents.positive"
            type="positive"
            :title="headlineEvents.positive.title"
            :importance="headlineEvents.positive.importance"
            :industries="headlineEvents.positive.industries"
            :event-id="headlineEvents.positive.eventId"
            @click="handleHeadlineClick"
          />
          <EventHeadlineCard
            v-if="headlineEvents.negative"
            type="negative"
            :title="headlineEvents.negative.title"
            :importance="headlineEvents.negative.importance"
            :industries="headlineEvents.negative.industries"
            :event-id="headlineEvents.negative.eventId"
            @click="handleHeadlineClick"
          />
        </div>
      </div>

      <!-- 分类Tab -->
      <div class="filter-section">
        <el-radio-group v-model="activeType" @change="handleFilterChange" size="small">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button label="产业政策">产业政策</el-radio-button>
          <el-radio-button label="地缘政治">地缘政治</el-radio-button>
          <el-radio-button label="技术突破">技术突破</el-radio-button>
          <el-radio-button label="市场动态">市场动态</el-radio-button>
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

export default {
  name: 'EventListView',
  components: {
    EventItemCard,
    EventHeadlineCard,
    Loading,
  },
  setup() {
    const router = useRouter()

    // ========== AI 今日精选 Mock 数据 ==========
    const headlineEvents = reactive({
      positive: {
        eventId: 'event-ai-computing-power',
        newsId: 'news-ai-computing-power',
        title: 'AI服务器需求持续增长，算力基础设施扩容确定性强',
        importance: 'major',
        industries: ['算力', '芯片', '软件']
      },
      negative: {
        eventId: 'event-real-estate',
        newsId: 'news-real-estate',
        title: '地产调控政策持续收紧，销售数据环比下滑',
        importance: 'major',
        industries: ['房地产', '建材', '家居']
      }
    })

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
      // TODO: 跳转新闻详情页
      ElMessage.info(`新闻功能暂未实现: ${event.title}`)
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
  background: #f5f7fa;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 24px;
  color: #fff;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
}

.page-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.page-content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
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

.headline-cards {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: stretch;
}

/* 筛选区域 */
.filter-section {
  margin-bottom: 20px;
}

/* 事件列表 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

/* 响应式 */
@media (max-width: 768px) {
  .headline-cards {
    flex-direction: column;
  }

  .page-content {
    padding: 16px;
  }
}
</style>