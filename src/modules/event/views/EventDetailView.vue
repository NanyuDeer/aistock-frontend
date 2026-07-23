<template>
  <div class="event-detail-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button class="back-btn" circle size="small" @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div class="header-content">
        <h1 class="page-title">AI事件分析</h1>
        <p class="page-subtitle" v-if="detail?.event">
          {{ detail.event.title }}
        </p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="state-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 错误状态 -->
    <el-empty v-else-if="error" description="加载失败">
      <template #image>
        <el-icon :size="64" color="#ef4444"><CircleCloseFilled /></el-icon>
      </template>
      <p class="error-message">{{ error }}</p>
      <el-button type="primary" @click="handleRetry">重试</el-button>
    </el-empty>

    <!-- 事件不存在 -->
    <el-empty v-else-if="!detail" description="事件不存在">
      <el-button type="primary" @click="handleBack">返回列表</el-button>
    </el-empty>

    <!-- AI 事件分析报告 -->
    <template v-else>
      <!-- 事件基本信息卡片 -->
      <el-card class="event-info-card" shadow="never">
        <div class="event-meta">
          <div class="meta-row">
            <span class="meta-label">发布时间</span>
            <span class="meta-value">{{ formatTime(detail.event?.publishTime) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">来源</span>
            <a
              v-if="detail.event?.sourceInfo?.url"
              class="meta-link"
              :href="detail.event.sourceInfo.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ detail.event.sourceInfo.name }}
              <el-icon><Link /></el-icon>
            </a>
            <span v-else class="meta-value">{{ detail.event?.source || '来源暂不可验证' }}</span>
          </div>
          <div class="meta-row" v-if="detail.event?.eventType">
            <span class="meta-label">事件类型</span>
            <el-tag size="small">{{ detail.event.eventType }}</el-tag>
          </div>
          <div class="meta-row" v-if="detail.event?.importance">
            <span class="meta-label">重要性</span>
            <el-rate v-model="detail.event.importance" disabled />
          </div>
        </div>
      </el-card>

      <!-- AI 分析报告组件 -->
      <AiEventReport :detail="detail" @back="handleBack" />
    </template>
  </div>
</template>

<script>
/**
 * 事件详情页
 *
 * 职责：
 * 1. 从路由获取事件ID
 * 2. 调用 eventApi 获取详情数据
 * 3. 使用 AiEventReport 展示 AI 分析报告
 *
 * 路由参数：
 * - id: 事件ID（必填）
 */
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CircleCloseFilled, Link } from '@element-plus/icons-vue'
import AiEventReport from '../components/AiEventReport.vue'
import { getEventDetail } from '@/modules/event/api/eventApi'

export default {
  name: 'EventDetailView',
  components: {
    AiEventReport,
    ArrowLeft,
    CircleCloseFilled,
    Link,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()

    // ========== 状态 ==========
    const detail = ref(null)
    const loading = ref(false)
    const error = ref('')

    // ========== 数据加载 ==========
    async function fetchDetail(eventId) {
      if (!eventId) {
        error.value = '事件ID不能为空'
        return
      }

      loading.value = true
      error.value = ''

      try {
        const response = await getEventDetail(eventId)
        detail.value = response
      } catch (err) {
        console.error('[EventDetailView] 加载失败:', err)
        error.value = err.message || '加载失败，请重试'
      } finally {
        loading.value = false
      }
    }

    // ========== 事件处理 ==========
    function handleBack() {
      router.push({ name: 'eventList' })
    }

    function handleRetry() {
      const eventId = route.params.id
      if (eventId) {
        fetchDetail(eventId)
      }
    }

    // ========== 工具函数 ==========
    function formatTime(time) {
      if (!time) return ''
      const d = new Date(time)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time.slice(11, 16)}`
    }

    // ========== 生命周期 ==========
    onMounted(() => {
      const eventId = route.params.id
      if (eventId) {
        fetchDetail(eventId)
      } else {
        error.value = '缺少事件ID参数'
      }
    })

    // 监听路由参数变化（支持动态切换）
    watch(
      () => route.params.id,
      (newId) => {
        if (newId && newId !== route.params.id) {
          fetchDetail(newId)
        }
      }
    )

    return {
      detail,
      loading,
      error,
      handleBack,
      handleRetry,
      formatTime,
    }
  },
}
</script>

<style scoped>
.event-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 页面头部 */
.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px 24px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.header-content {
  flex: 1;
  min-width: 0;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13px;
  opacity: 0.9;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 状态容器 */
.state-container {
  padding: 80px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.error-message {
  color: #6b7280;
  margin: 16px 0;
}

/* 事件基本信息卡片 */
.event-info-card {
  margin: 16px;
  border-radius: 12px;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-label {
  font-size: 13px;
  color: #6b7280;
  width: 80px;
  flex-shrink: 0;
}

.meta-value {
  font-size: 13px;
  color: #374151;
}

.meta-link {
  font-size: 13px;
  color: #3b82f6;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-link:hover {
  text-decoration: underline;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    padding: 12px 16px;
  }

  .page-title {
    font-size: 16px;
  }

  .event-info-card {
    margin: 12px;
  }
}
</style>