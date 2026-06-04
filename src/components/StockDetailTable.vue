<template>
  <div>
    <div v-if="!stocks || stocks.length === 0" style="font-size:11px;color:#d1d5db;padding:2px 0;">暂无</div>
    <table v-else class="hs-stock-table">
      <thead>
        <tr>
          <th>代码</th>
          <th>名称</th>
          <th>行业</th>
          <th class="col-pnl">评分</th>
          <th>行情</th>
          <th>理由</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in stocks" :key="s.code" @click="$emit('go-stock', s.code)" style="cursor:pointer;">
          <td class="col-code">{{ s.code }}</td>
          <td class="col-name">{{ s.name }}</td>
          <td class="col-industry">
            <span v-if="s.in_concept" class="hs-stock-concept">概念</span>
            <span class="hs-stock-industry">{{ s.industry }}</span>
          </td>
          <td class="col-pnl">
            <span :class="s.score >= 60 ? 'hs-pnl-up' : 'hs-pnl-flat'">{{ s.score }}</span>
          </td>
          <td class="col-quote">
            <span class="hs-quote-price">{{ s.price != null ? Number(s.price).toFixed(2) : '--' }}</span>
            <span :class="['hs-quote-change', (s.change_pct ?? 0) >= 0 ? 'up' : 'down']">
              {{ s.change_pct != null ? ((s.change_pct >= 0 ? '+' : '') + Number(s.change_pct).toFixed(2) + '%') : '--' }}
            </span>
          </td>
          <td class="col-reason" :title="s.reason">{{ s.reason || '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'StockDetailTable',
  props: {
    stocks: { type: Array, default: () => [] },
  },
  emits: ['go-stock'],
};
</script>

<style scoped>
.hs-stock-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.hs-stock-table th {
  text-align: left; color: #9ca3af; font-weight: 500; font-size: 10px;
  padding: 2px 4px 3px; border-bottom: 1px solid #f0f0f0; white-space: nowrap;
}
.hs-stock-table th.col-pnl { text-align: right; }
.hs-stock-table td {
  padding: 3px 4px; border-bottom: 1px solid #f8f8f8;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0;
}
.hs-stock-table tr:hover td { background: #f9fafb; }
.hs-stock-table .col-code { width: 9%; color: #9ca3af; font-size: 10px; }
.hs-stock-table .col-name { width: 12%; font-weight: 600; color: #111827; }
.hs-stock-table .col-industry { width: 14%; }
.hs-stock-table .col-pnl { width: 8%; text-align: right; }
.hs-stock-table .col-quote { width: 18%; }
.hs-stock-table .col-reason { width: 39%; }
.hs-stock-industry { font-size: 10px; color: #2563eb; padding: 0px 3px; background: #eff6ff; border-radius: 3px; }
.hs-stock-concept { font-size: 10px; color: #dc2626; padding: 0px 3px; background: #fef2f2; border-radius: 3px; margin-right: 2px; }
.hs-pnl-up { color: #dc2626; }
.hs-pnl-flat { color: #9ca3af; }
.hs-quote-price { color: #111827; font-weight: 600; margin-right: 4px; }
.hs-quote-change { font-weight: 600; font-size: 10px; }
.hs-quote-change.up { color: #f56c6c; }
.hs-quote-change.down { color: #67c23a; }
</style>
