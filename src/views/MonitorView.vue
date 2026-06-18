<template>
  <div class="monitor-page">
    <TheNavbar />
    <div class="page-container">
      <div class="container">
        <div class="page-header">
          <h2 class="page-title">风口爆发</h2>
          <p class="page-desc">聚合格隆汇/财联社快讯 + 飞书群消息 + 同花顺热点掘金，三重共振发现风口爆发个股</p>
        </div>

        <!-- 风口爆发列表 -->
        <div class="monitor-content">
          <HotspotOutbreakPanel :show-more-link="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TheNavbar from '@/components/TheNavbar.vue'
import HotspotOutbreakPanel from '@/components/HotspotOutbreakPanel.vue'

export default {
  name: 'MonitorView',
  components: { TheNavbar, HotspotOutbreakPanel },
  setup() {
    return {}
  }
}
</script>

<style lang="scss" scoped>
.monitor-page {
  padding-top: 80px;
  min-height: 100vh;
  background: var(--background-color);

  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 15px;
  }

  .page-header {
    margin-bottom: 20px;

    .page-title {
      font-size: 1.4rem;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    .page-desc {
      font-size: 0.9rem;
      color: var(--text-tertiary);
    }
  }

  .monitor-content {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
}
</style>
