<template>
  <div class="analysis-section" :class="{ 'is-pending': status === 'pending' }">
    <!-- 步骤头部：蓝色实心编号圆 + 标题 + 状态 -->
    <div class="section-header">
      <div class="section-number" :class="numStatusClass">
        <span class="section-num-text">{{ padNumber }}</span>
      </div>
      <span class="section-title">{{ title }}</span>
      <div class="section-status" v-if="status === 'processing'">
        <el-icon class="is-loading status-spinner"><Loading /></el-icon>
        <span class="status-label">AI开始分析…</span>
      </div>
      <div class="section-status" v-else-if="status === 'completed'">
        <span class="status-label done">✓ 完成</span>
      </div>
      <span class="section-status pending-label" v-else>等待中</span>
    </div>

    <!-- 思考过程折叠：防御式，仅在有 explanation 文本时渲染（当前后端未存 per-step 文本 → 正常隐藏，不造空区域） -->
    <div class="section-thinking" v-if="status === 'completed' && explanation">
      <div class="thinking-head" @click="thinkingOpen = !thinkingOpen">
        <span class="thinking-toggle">{{ thinkingOpen ? '▾' : '▸' }}</span>
        <span class="thinking-title">查看思考过程</span>
      </div>
      <div class="thinking-body" v-if="thinkingOpen">{{ explanation }}</div>
    </div>

    <!-- 分析内容（仅 completed 时展示业务组件） -->
    <div class="section-body" v-if="status === 'completed' && $slots.default">
      <slot />
    </div>
  </div>
</template>

<script>
/**
 * AiAnalysisSection — Web 端统一 AI 推理步骤容器
 *
 * 镜像 APP 端同名组件（AiAnalysisSection.vue）：
 * 白底卡片 + 蓝色实心编号圆（01-05，padStart）+ 步骤标题 + 右侧状态标签。
 *
 * 三种状态（对齐 APP useAiReasoning 的 StepStatus）：
 * - pending    等待中（整卡淡化）
 * - processing AI开始分析…（转圈；正文区留空，等待该步结果）
 * - completed  ✓ 完成（渲染业务子组件）
 *
 * 说明：APP 的 StepStatus 还含 generating，但该状态在 APP 事件页从未被使用
 * （streamingText 恒为空），故此处不实现，避免造出永不到达的分支。
 *
 * 思考过程折叠：防御式呈现——仅当传入 explanation 文本字段时才渲染该折叠区；
 * 当前 Web 存储报告未提供 per-step 思考文本，故正常隐藏，避免出现空区域（项目防御式规约）。
 *
 * Props:
 * - stepNumber: 步骤序号
 * - title: 步骤标题
 * - status: pending | processing | completed
 * - explanation: （可选）AI 完成后的思考/解释文本；无则隐藏折叠区
 *
 * Slot: default — completed 后的业务组件
 */
import { ref, computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'

export default {
  name: 'AiAnalysisSection',
  components: {
    Loading,
  },
  props: {
    stepNumber: { type: Number, required: true },
    title: { type: String, default: '' },
    status: { type: String, default: 'pending' },
    explanation: { type: String, default: '' },
  },
  setup(props) {
    const thinkingOpen = ref(false)

    const padNumber = computed(() => String(props.stepNumber).padStart(2, '0'))
    const numStatusClass = computed(() =>
      props.status === 'pending' ? 'num-pending' : 'num-active'
    )

    return { thinkingOpen, padNumber, numStatusClass }
  },
}
</script>

<style lang="scss" scoped>
.analysis-section {
  position: relative;
  background: var(--ev-bg-card);
  border: 1px solid var(--ev-line);
  border-radius: var(--ev-r-md);
  padding: 16px 16px 14px;
  margin-bottom: 14px;
  transition: opacity 0.3s ease;
}

.analysis-section.is-pending {
  opacity: 0.55;
}

/* ===== 步骤头部 ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

/* 蓝色实心编号圆 01-05 */
.section-number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.num-active {
  background: var(--ev-primary);
  box-shadow: 0 2px 8px rgba(11, 95, 255, 0.25);
}

.num-pending {
  background: rgba(138, 150, 176, 0.15);
}

.section-num-text {
  font-size: 12px;
  font-weight: 700;
  transition: color 0.3s ease;
}

.num-active .section-num-text { color: #ffffff; }
.num-pending .section-num-text { color: var(--ev-text-muted); }

.section-title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: var(--ev-text-primary);
  min-width: 0;
}

.is-pending .section-title { color: var(--ev-text-muted); }

/* 状态标签 */
.section-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-label { font-size: 12px; color: var(--ev-primary); font-weight: 500; }
.status-label.done { color: var(--ev-positive); }
.status-spinner { font-size: 12px; color: var(--ev-primary); }
.pending-label { font-size: 12px; color: var(--ev-text-muted); }

/* ===== 思考过程折叠（防御式：有 explanation 才显示） ===== */
.section-thinking {
  margin-bottom: 12px;
  border: 1px solid var(--ev-line);
  border-radius: var(--ev-r-sm);
  overflow: hidden;
}

.thinking-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--ev-bg-soft);
  cursor: pointer;
  user-select: none;
}

.thinking-toggle {
  font-size: 12px;
  color: var(--ev-accent);
}

.thinking-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ev-text-secondary);
}

.thinking-body {
  font-size: 12px;
  color: var(--ev-text-muted);
  line-height: 1.6;
  padding: 10px 12px;
  border-top: 1px solid var(--ev-line);
}

/* ===== 分析内容 ===== */
.section-body {
  /* 子组件自管理 */
}
</style>