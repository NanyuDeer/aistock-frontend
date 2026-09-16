<template>
  <div class="event-detail-page">
    <!-- 页面头部：白底导航栏（返回按钮 + 页面标题），镜像 APP SubPageCard2 的白色导航栏。
         这里只放页面级标题「事件机会洞见」，事件自身的标题仍由报告 Hero 卡呈现，避免重复。 -->
    <div class="page-header">
      <div class="header-inner">
        <el-button class="back-btn" circle size="small" @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h1 class="page-title">事件机会洞见</h1>
      </div>
    </div>

    <!-- 阅读栏：单列限宽居中，宽屏下不再铺满视口 -->
    <div class="page-body">
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
        <!-- AI 分析报告组件（元信息由 AiEventReport 的 Hero 卡统一呈现，与 APP 一致） -->
        <AiEventReport :detail="detail" @back="handleBack" />
      </template>
    </div>
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
import { ArrowLeft, CircleCloseFilled } from '@element-plus/icons-vue'
import AiEventReport from '../components/AiEventReport.vue'
import { getEventDetail } from '@/modules/event/api/eventApi'

export default {
  name: 'EventDetailView',
  components: {
    AiEventReport,
    ArrowLeft,
    CircleCloseFilled,
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
    }
  },
}
</script>

<style scoped>
.event-detail-page {
  min-height: 100vh;
  /* 让位全站固定导航栏（TheNavbar: fixed / 60px），否则页头被其遮挡 */
  padding-top: 60px;
  background: #eef3fb; /* 对齐 APP $bg-page，蓝色金融系统页底 */
}

/* 详情页栏宽：单列居中限宽，页头与报告共用同一栏宽。
 * 窄屏 = 阅读栏；≥1200px = 阅读栏 + 左侧步骤轨（见 --ev-page-w / --ev-page-w-wide） */
.header-inner,
.page-body {
  width: 100%;
  max-width: calc(var(--ev-page-w) + var(--ev-content-pad) * 2);
  margin: 0 auto;
  padding-left: var(--ev-content-pad);
  padding-right: var(--ev-content-pad);
}

/* 断点需与 AiEventReport.vue 的步骤轨 media query 保持一致 */
@media (min-width: 1200px) {
  .header-inner,
  .page-body {
    --ev-page-w: var(--ev-page-w-wide);
  }
}

.page-body {
  padding-top: 16px;
}

/* 页面头部：白底导航栏（返回按钮 + 页面标题），镜像 APP SubPageCard2 的白色导航栏。
 * 高度 = 标题行高 24px + 上下内边距各 10px，与 AiEventReport 的 SPY_LINE 假定（120 = 导航栏 60 + 页头 44 + 16）一致。 */
.page-header {
  background: var(--ev-bg-card);
  color: var(--ev-text-primary);
  border-bottom: 1px solid var(--ev-line);
  position: sticky;
  top: 60px; /* 吸附位置让开固定导航栏 */
  z-index: 100;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 4px; /* 对齐 APP SubPageCard2：返回按钮与标题间距 $s-1 */
  padding-top: 10px;
  padding-bottom: 10px;
}

/* 返回按钮：沿用项目既有形态（el-button circle size=small + ArrowLeft），配色适配白底 */
.back-btn {
  background: transparent;
  border-color: transparent;
  color: var(--ev-text-primary);
}

.back-btn:hover,
.back-btn:focus {
  background: var(--ev-bg-soft);
  border-color: transparent;
  color: var(--ev-primary);
}

.page-title {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  color: var(--ev-text-primary);
}

/* 状态容器（栏宽由 .page-body 统一提供） */
.state-container {
  padding: 64px 0;
}

.error-message {
  color: #8a96b0; /* 对齐 --ev-text-muted */
  margin: 16px 0;
}

/* 响应式：小屏收窄呼吸位（栏宽已随视口自适应） */
@media (max-width: 768px) {
  .header-inner,
  .page-body {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>