<template>
  <div class="investment-logic-header">
    <!-- 上方分隔 -->
    <div class="divider-line" />

    <!-- 标题 -->
    <span class="section-title">投资逻辑解析</span>

    <!-- 说明文字 -->
    <p class="section-desc">
      AI将从事件背景、影响因素、产业链传导及历史验证等角度，拆解该投资机会的形成原因。
    </p>
  </div>
</template>

<script>
/**
 * InvestmentLogicHeader — Web 端投资逻辑解析过渡模块
 *
 * 镜像 APP 端同名组件（InvestmentLogicHeader.vue）：
 * 纯信息架构过渡组件，不承载业务数据，位于 AI投资机会 与 事件理解 之间，
 * 引导用户进入深度解读。
 */
export default {
  name: 'InvestmentLogicHeader',
}
</script>

<style lang="scss" scoped>
.investment-logic-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
}

.divider-line {
  width: 30px;
  height: 2px;
  border-radius: 1px;
  background: var(--ev-accent);
  opacity: 0.35;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ev-text-primary);
  margin-bottom: 8px;
  text-align: center;
}

.section-desc {
  font-size: 12px;
  color: var(--ev-text-muted);
  line-height: 1.6;
  text-align: center;
  max-width: 80%;
  margin: 0;
}
</style>