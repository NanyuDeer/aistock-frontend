<template>
  <div class="stock-resonance-panel">
    <div class="panel-header">
      <h3>三重共振</h3>
      <span class="outbreak-badge" v-if="resonance?.isOutbreak">爆发</span>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!resonance" class="empty">暂无共振数据</div>
    <div v-else class="resonance-body">
      <div class="resonance-row">
        <div class="resonance-item" :class="{ on: resonance.resonance1?.verified }">
          <span class="resonance-dot"></span>
          <div class="resonance-info">
            <span class="resonance-title">共振一：双源概念交叉</span>
            <span class="resonance-status">{{ resonance.resonance1?.verified ? '已点亮' : '未点亮' }}</span>
          </div>
        </div>
        <div class="resonance-concepts" v-if="resonance.resonance1?.concepts?.length">
          <span class="concept-tag" v-for="c in resonance.resonance1.concepts" :key="c.conceptTsCode">
            {{ c.conceptName }}
          </span>
        </div>
      </div>

      <div class="resonance-row">
        <div class="resonance-item" :class="{ on: resonance.resonance2?.verified }">
          <span class="resonance-dot"></span>
          <div class="resonance-info">
            <span class="resonance-title">共振二：大板块热点掘金</span>
            <span class="resonance-status">
              {{ resonance.resonance2?.verified ? `已点亮 #${resonance.resonance2.bestRank}` : '未点亮' }}
            </span>
          </div>
        </div>
        <div class="resonance-concepts" v-if="resonance.resonance2?.matchedSectors?.length">
          <div v-for="s in resonance.resonance2.matchedSectors" :key="s.sectorName + s.conceptTsCode" class="concept-detail">
            <span class="concept-tag">{{ s.conceptName }}</span>
            <span class="rank-text">板块排名 #{{ s.rank }}</span>
            <span class="industry-text">{{ s.sectorName }}</span>
          </div>
        </div>
      </div>

      <div class="resonance-row">
        <div class="resonance-item" :class="{ on: resonance.resonance3?.verified }">
          <span class="resonance-dot"></span>
          <div class="resonance-info">
            <span class="resonance-title">共振三：VIP研报推荐</span>
            <span class="resonance-status">{{ resonance.resonance3?.verified ? '已点亮' : '未点亮' }}</span>
          </div>
        </div>
        <div class="resonance-reports" v-if="resonance.resonance3?.reports?.length">
          <div v-for="(r, idx) in resonance.resonance3.reports" :key="idx" class="report-item">
            <span class="report-chat">{{ r.chatName }}</span>
            <span class="report-time">{{ formatTime(r.receivedAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StockResonancePanel',
  props: {
    resonance: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  methods: {
    formatTime(timeStr) {
      if (!timeStr) return ''
      try {
        return new Date(timeStr).toLocaleString('zh-CN')
      } catch {
        return timeStr
      }
    },
  },
}
</script>

<style scoped>
.stock-resonance-panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.panel-header h3 { margin: 0; font-size: 16px; }
.outbreak-badge {
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}
.resonance-row {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.resonance-row:last-child { border-bottom: none; }
.resonance-item {
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0.5;
}
.resonance-item.on { opacity: 1; }
.resonance-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
}
.resonance-item.on .resonance-dot { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
.resonance-info {
  display: flex;
  flex-direction: column;
}
.resonance-title { font-weight: 600; font-size: 14px; }
.resonance-status { font-size: 12px; color: #64748b; }
.resonance-concepts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  padding-left: 22px;
}
.concept-tag {
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}
.concept-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rank-text { color: #f97316; font-size: 11px; font-weight: 600; }
.industry-text { color: #64748b; font-size: 11px; }
.resonance-reports {
  margin-top: 8px;
  padding-left: 22px;
}
.report-item {
  font-size: 12px;
  color: #475569;
}
.report-time { color: #94a3b8; margin-left: 8px; }
.loading, .empty, .error { text-align: center; padding: 20px 0; color: #64748b; }
.error { color: #ef4444; }
</style>
