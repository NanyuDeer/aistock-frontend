<template>
  <div class="hot-sector-panel">
    <!-- 标题栏 -->
    <div class="hs-header">
      <h3 class="section-title">长线风口龙头</h3>
      <div class="hs-header-actions">
        <span class="hs-header-meta" v-if="displayUpdateTime">更新时间: {{ displayUpdateTime }}</span>
        <el-button class="hs-history-btn" type="primary" plain size="small" @click="goToHistoryPerformance">
          查看历史表现
        </el-button>
      </div>
    </div>

    <!-- 主体：泡泡图（窄屏在上） + 龙头股卡片 + 泡泡图（宽屏在右） -->
    <div class="hs-body">
      <!-- 窄屏：风口概念泡泡图（上方） -->
      <div class="hs-bubble-area hs-bubble-area-top">
        <div class="hs-bubble-card">
          <div class="hs-bubble-title">风口概念</div>
          <div class="hs-bubble-wrap" ref="bubbleWrap">
            <svg ref="bubbleSvg"></svg>
          </div>
        </div>
      </div>

      <!-- 龙头股卡片（2行×4列） -->
      <div class="hs-cards-area">
        <div class="hs-cards-grid">
          <div
            v-for="(stock, idx) in displayStocks"
            :key="stock.code + '-' + idx"
            class="hs-stock-card"
            @click="goToStockByCode(stock.code)"
          >
            <div class="hs-card-info">
              <div class="hs-card-header">
                <h4 class="hs-card-name">{{ stock.name }}</h4>
                <span class="hs-card-industry">{{ stock.track }}</span>
              </div>
              <p class="hs-card-code">
                <span class="hs-market-code" v-if="getMarketCode(stock.code)">{{ getMarketCode(stock.code) }}</span>
                {{ stock.code }}
              </p>
              <div class="hs-card-metrics">
                <div class="hs-metric">
                  <span class="hs-metric-label">最新价</span>
                  <span class="hs-metric-value">{{ stock.latestPrice || '--' }}</span>
                </div>
                <div class="hs-metric">
                  <span class="hs-metric-label">涨跌幅</span>
                  <span :class="['hs-metric-value', stock.changeRate >= 0 ? 'up' : 'down']">
                    {{ formatChange(stock.changeRate) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="hs-card-actions">
              <el-button size="small" type="primary" plain @click.stop="goToStockByCode(stock.code)">查看详情</el-button>
              <el-button
                v-if="isLoggedIn"
                size="small"
                :type="isFollowed(stock.code) ? 'danger' : 'primary'"
                plain
                :loading="followLoading[stock.code]"
                @click.stop="toggleFollow(stock)"
              >
                {{ isFollowed(stock.code) ? '取消关注' : '添加关注' }}
              </el-button>
              <el-button
                v-else
                size="small"
                type="primary"
                plain
                @click.stop="router.push('/login')"
              >
                登录关注
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 宽屏：风口概念泡泡图（右侧） -->
      <div class="hs-bubble-area hs-bubble-area-side">
        <div class="hs-bubble-card">
          <div class="hs-bubble-title">风口概念</div>
          <div class="hs-bubble-wrap" ref="bubbleWrapSide">
            <svg ref="bubbleSvgSide"></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 二级弹窗 -->
    <el-dialog
      v-model="modalVisible"
      :title="modalTitle"
      width="90%"
      :close-on-click-modal="true"
      :destroy-on-close="true"
      class="hs-modal-dialog"
      top="5vh"
    >
      <div v-if="currentSector" class="hs-sector-row">
        <!-- 左侧：板块信息 -->
        <div class="hs-sector-left">
          <div class="hs-sector-header">
            <span class="hs-sector-name">{{ currentSector.name }}</span>
            <span class="hs-sector-badge badge-hot">上榜{{ currentSector.frequency }}次</span>
            <span
              :class="['hs-persistence-tag',
                (currentSector.ai_analysis?.persistence || '').includes('长期') ? 'persistence-long' :
                (currentSector.ai_analysis?.persistence || '').includes('中期') ? 'persistence-mid' : 'persistence-short']"
            >{{ currentSector.ai_analysis?.persistence || '--' }}</span>
          </div>
          <div class="hs-sector-stats">
            <div class="hs-stat-item">
              <div class="hs-stat-label">今日涨幅</div>
              <div :class="['hs-stat-value', currentSector.today_change >= 0 ? 'up' : 'down']">
                {{ currentSector.today_change >= 0 ? '+' : '' }}{{ currentSector.today_change }}%
              </div>
            </div>
            <div class="hs-stat-item">
              <div class="hs-stat-label">均涨幅</div>
              <div :class="['hs-stat-value', currentSector.avg_change >= 0 ? 'up' : 'down']">
                {{ currentSector.avg_change >= 0 ? '+' : '' }}{{ currentSector.avg_change }}%
              </div>
            </div>
            <div class="hs-stat-item">
              <div class="hs-stat-label">净流入</div>
              <div :class="['hs-stat-value', currentSector.amount_trend >= 0 ? 'up' : 'down']">
                {{ formatNetInflow(currentSector.amount_trend) }}
              </div>
            </div>
            <div class="hs-stat-item">
              <div class="hs-stat-label">领涨股</div>
              <div class="hs-stat-value" style="font-size: 0.85em;">
                {{ currentSector.leading_stock || '--' }}
              </div>
            </div>
          </div>
          <!-- 层级流向图 -->
          <div class="hs-flow-chart" ref="flowChartWrap"></div>
          <div class="hs-transfer-info">
            <div><span class="hs-label">传递方向：</span>{{ currentSector.ai_analysis?.transfer_direction || '--' }}</div>
            <div><span class="hs-label">传递判断：</span>{{ currentSector.ai_analysis?.transfer_reason || '--' }}</div>
            <div><span class="hs-label">持续原因：</span>{{ currentSector.ai_analysis?.persistence_reason || '--' }}</div>
            <div><span class="hs-label">风险：</span><span class="hs-risk-tag">{{ currentSector.ai_analysis?.risk_warning || '--' }}</span></div>
          </div>
        </div>
        <!-- 右侧：筛选股票 -->
        <div class="hs-sector-right">
          <div class="hs-stock-group">
            <div class="hs-stock-group-label"><span class="hs-dot dot-main"></span>风口精选</div>
            <div class="hs-detail-stock-table" v-if="currentSector.main_stocks?.length">
              <div class="hs-detail-thead">
                <span>名称</span><span>行业</span><span class="col-price">价格</span><span class="col-pnl">盈亏</span><span>理由</span>
              </div>
              <div v-for="s in currentSector.main_stocks" :key="s.code" class="hs-detail-row clickable" @click="goToStockByCode(s.code)">
                <span class="hs-detail-name">{{ s.name }}</span>
                <span class="hs-detail-industry">
                  <span v-if="s.in_concept" class="hs-concept-tag">概念</span>
                  <span class="hs-industry-tag">{{ s.industry?.replace(/\(A股\)|A股/g, '') }}</span>
                </span>
                <span class="col-price">{{ s.price != null ? Number(s.price).toFixed(2) : '--' }}</span>
                <span :class="['col-pnl', s.change_pct > 0 ? 'pnl-up' : s.change_pct < 0 ? 'pnl-down' : 'pnl-flat']">
                  {{ s.change_pct != null ? (s.change_pct > 0 ? '+' : '') + Number(s.change_pct).toFixed(2) + '%' : '--' }}
                </span>
                <span class="hs-detail-reason" :title="s.reason">
                  {{ s.reason || '' }}
                </span>
              </div>
            </div>
            <div v-else class="hs-detail-empty">暂无</div>
          </div>
          <div class="hs-stock-group">
            <div class="hs-stock-group-label"><span class="hs-dot dot-up"></span>上游带动</div>
            <div class="hs-detail-stock-table" v-if="currentSector.upstream_stocks?.length">
              <div class="hs-detail-thead">
                <span>名称</span><span>行业</span><span class="col-price">价格</span><span class="col-pnl">盈亏</span><span>理由</span>
              </div>
              <div v-for="s in currentSector.upstream_stocks" :key="s.code" class="hs-detail-row clickable" @click="goToStockByCode(s.code)">
                <span class="hs-detail-name">{{ s.name }}</span>
                <span class="hs-detail-industry">
                  <span v-if="s.in_concept" class="hs-concept-tag">概念</span>
                  <span class="hs-industry-tag">{{ s.industry?.replace(/\(A股\)|A股/g, '') }}</span>
                </span>
                <span class="col-price">{{ s.price != null ? Number(s.price).toFixed(2) : '--' }}</span>
                <span :class="['col-pnl', s.change_pct > 0 ? 'pnl-up' : s.change_pct < 0 ? 'pnl-down' : 'pnl-flat']">
                  {{ s.change_pct != null ? (s.change_pct > 0 ? '+' : '') + Number(s.change_pct).toFixed(2) + '%' : '--' }}
                </span>
                <span class="hs-detail-reason" :title="s.reason">
                  {{ s.reason || '' }}
                </span>
              </div>
            </div>
            <div v-else class="hs-detail-empty">暂无</div>
          </div>
          <div class="hs-stock-group">
            <div class="hs-stock-group-label"><span class="hs-dot dot-down"></span>下游传导</div>
            <div class="hs-detail-stock-table" v-if="currentSector.downstream_stocks?.length">
              <div class="hs-detail-thead">
                <span>名称</span><span>行业</span><span class="col-price">价格</span><span class="col-pnl">盈亏</span><span>理由</span>
              </div>
              <div v-for="s in currentSector.downstream_stocks" :key="s.code" class="hs-detail-row clickable" @click="goToStockByCode(s.code)">
                <span class="hs-detail-name">{{ s.name }}</span>
                <span class="hs-detail-industry">
                  <span v-if="s.in_concept" class="hs-concept-tag">概念</span>
                  <span class="hs-industry-tag">{{ s.industry?.replace(/\(A股\)|A股/g, '') }}</span>
                </span>
                <span class="col-price">{{ s.price != null ? Number(s.price).toFixed(2) : '--' }}</span>
                <span :class="['col-pnl', s.change_pct > 0 ? 'pnl-up' : s.change_pct < 0 ? 'pnl-down' : 'pnl-flat']">
                  {{ s.change_pct != null ? (s.change_pct > 0 ? '+' : '') + Number(s.change_pct).toFixed(2) + '%' : '--' }}
                </span>
                <span class="hs-detail-reason" :title="s.reason">
                  {{ s.reason || '' }}
                </span>
              </div>
            </div>
            <div v-else class="hs-detail-empty">暂无</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import * as d3 from 'd3';

/**
 * 从后端sector数据提取每个板块的龙头股（优先使用概念板块页面爬取的龙头股）
 * 跨板块去重：当两个板块选出同一只股票时，风口得分更高的板块保留该股票，另一个板块使用下一只候选
 */
function extractTopStocksFromSectors(sectors) {
  // 按板块score降序排列，高分板块优先保留龙头股
  const sortedSectors = [...sectors].sort((a, b) => (b.score || 0) - (a.score || 0));
  const usedCodes = new Set();
  const stocks = [];

  for (const sector of sortedSectors) {
    if (stocks.length >= 8) break;

    // 构建该板块的候选股票列表（按评分降序）
    const candidates = [];

    // 第一候选：概念板块页面爬取的龙头股
    const leadInfo = sector.leading_stock_info;
    if (leadInfo && leadInfo.code) {
      candidates.push({
        code: leadInfo.code,
        name: leadInfo.name,
        track: sector.name,
        latestPrice: leadInfo.price != null ? String(leadInfo.price) : '--',
        changeRate: leadInfo.change_pct != null ? leadInfo.change_pct : 0,
        leaderBasis: leadInfo.reason || '',
        score: leadInfo.change_pct || 0,
      });
    }

    // 补充候选：从main_stocks中按评分排序
    const mainStocks = (sector.main_stocks || [])
      .map(s => ({ ...s, track: sector.name }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    for (const s of mainStocks) {
      if (!candidates.some(c => c.code === s.code)) {
        candidates.push({
          code: s.code,
          name: s.name,
          track: sector.name,
          latestPrice: s.price != null ? String(s.price) : '--',
          changeRate: s.change_pct != null ? s.change_pct : 0,
          leaderBasis: s.reason || '',
          score: s.score || 0,
        });
      }
    }

    // 从候选列表中选第一个未被占用的股票
    for (const c of candidates) {
      if (!usedCodes.has(c.code)) {
        usedCodes.add(c.code);
        stocks.push(c);
        break;
      }
    }
  }
  return stocks.slice(0, 8);
}

function extractBubblesFromSectors(sectors) {
  return sectors.slice(0, 8).map(s => ({
    name: s.name,
    change: s.today_change || 0,
    frequency: s.frequency || 0,
    score: s.score || 0,
    persistence: s.ai_analysis?.persistence || '短期(1-3天)',
  }));
}

export default {
  name: 'WindLeaderPanel',
  props: {
    sectors: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    updateTime: { type: String, default: '' },
    quoteMap: { type: Object, default: () => ({}) },
  },
  emits: ['retry'],
  setup(props) {
    const router = useRouter();
    const store = useStore();
    const bubbleWrap = ref(null);
    const bubbleSvg = ref(null);
    const bubbleWrapSide = ref(null);
    const bubbleSvgSide = ref(null);
    const flowChartWrap = ref(null);
    const modalVisible = ref(false);
    const modalTitle = ref('');
    const currentSector = ref(null);
    const followLoading = ref({});
    let resizeTimer = null;
    let bubbleObservers = [];
    let panelResizeObserver = null;

    const isLoggedIn = computed(() => store.getters.isLoggedIn);

    const isFollowed = (code) => {
      if (!code) return false;
      return (store.getters.favoriteStocks || []).some(item => String(item.code) === String(code));
    };

    const toggleFollow = async (stock) => {
      const code = stock?.code || stock;
      if (!code) return;
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录后才能添加自选股');
        router.push('/login');
        return;
      }
      followLoading.value = { ...followLoading.value, [code]: true };
      try {
        const wasFollowed = isFollowed(code);
        if (wasFollowed) {
          const result = await store.dispatch('removeFavoriteStocks', [code]);
          if (result) {
            ElMessage.success(`已取消关注 ${stock?.name || code}`);
          } else {
            ElMessage.error('取消关注失败');
          }
        } else {
          const result = await store.dispatch('addFavoriteStocks', [
            { code, name: stock?.name }
          ]);
          if (result) {
            ElMessage.success(`已添加 ${stock?.name || code} 到自选股`);
          } else {
            ElMessage.error('添加关注失败');
          }
        }
      } catch (err) {
        console.error('[WindLeaderPanel] 关注操作失败:', err);
        ElMessage.error('操作失败，请稍后再重试');
      } finally {
        followLoading.value = { ...followLoading.value, [code]: false };
      }
    };

    const useBackendData = computed(() => props.sectors && props.sectors.length > 0);

    // 每个板块得分最高的1只龙头股，最多8只
    const displayStocks = computed(() => {
      if (!useBackendData.value) return [];
      let stocks = extractTopStocksFromSectors(props.sectors);
      // 合并实时行情
      if (props.quoteMap && Object.keys(props.quoteMap).length > 0) {
        stocks = stocks.map(s => {
          const q = props.quoteMap[s.code];
          if (!q) return s;
          return {
            ...s,
            latestPrice: q.latest_price != null ? String(q.latest_price) : s.latestPrice,
            changeRate: q.change_percent != null ? q.change_percent : s.changeRate,
          };
        });
      }
      return stocks;
    });

    const displayBubbles = computed(() => {
      if (!useBackendData.value) return [];
      return extractBubblesFromSectors(props.sectors);
    });

    const displayUpdateTime = computed(() => {
      if (props.updateTime) return props.updateTime;
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });

    const formatChange = (val) => {
      const n = parseFloat(val);
      if (isNaN(n)) return '--';
      return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
    };

    const formatNetInflow = (val) => {
      const n = parseFloat(val);
      if (isNaN(n) || n === 0) return '--';
      // amount_trend存储的是万元
      const yi = n / 10000;
      if (Math.abs(yi) >= 1) {
        return `${yi >= 0 ? '+' : ''}${yi.toFixed(2)}亿`;
      }
      return `${n >= 0 ? '+' : ''}${n.toFixed(0)}万`;
    };

    const getMarketCode = (code) => {
      if (!code) return '';
      if (code.startsWith('6') || code.startsWith('9')) return 'SH';
      if (code.startsWith('0') || code.startsWith('3')) return 'SZ';
      if (code.startsWith('4') || code.startsWith('8')) return 'BJ';
      return '';
    };

    const goToStockByCode = (code) => {
      if (code) router.push(`/stock/${code}`);
    };

    // ===== 泡泡图 =====
    const renderBubbleChart = (wrapRef, svgRef) => {
      if (!wrapRef || !svgRef) return;
      const svg = d3.select(svgRef);
      const rect = wrapRef.getBoundingClientRect();
      const width = rect.width || 280;
      const height = rect.height || 280;
      svg.attr('width', width).attr('height', height);

      const bubbles = displayBubbles.value;
      if (!bubbles || bubbles.length === 0) return;

      // 泡泡大小映射：按AI判断的持续时间 persistence
      const persistenceWeight = (p) => {
        if (!p) return 1;
        if (p.includes('长期')) return 3;
        if (p.includes('中期')) return 2;
        return 1;
      };

      const bubbleData = bubbles.map((s, i) => {
        const pw = persistenceWeight(s.persistence);
        // 短期→22-27, 中期→29-34, 长期→36-42
        const rMap = { 1: [22, 27], 2: [29, 34], 3: [36, 42] };
        const [minP, maxP] = rMap[pw];
        // 同级别内按score微调
        const scores = bubbles.map(b => b.score || 0);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const scoreNorm = (maxScore > minScore) ? ((s.score || 0) - minScore) / (maxScore - minScore) : 0.5;
        const r = minP + (maxP - minP) * scoreNorm;
        return { ...s, idx: i, r };
      });

      const simulation = d3.forceSimulation(bubbleData)
        .force('charge', d3.forceCollide().radius(d => d.r + 4).strength(0.9))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.12))
        .force('y', d3.forceY(height / 2).strength(0.12))
        .stop();
      for (let i = 0; i < 200; i++) simulation.tick();

      // 边界约束：确保泡泡不超出画布
      for (const d of bubbleData) {
        d.x = Math.max(d.r + 2, Math.min(width - d.r - 2, d.x));
        d.y = Math.max(d.r + 2, Math.min(height - d.r - 2, d.y));
      }

      // 泡泡颜色映射：按概念评分 score（低分浅色，高分深色）
      const scores = bubbles.map(s => s.score || 0);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const colorScale = d3.scaleLinear()
        .domain([minScore, maxScore])
        .range(['#bfdbfe', '#1d4ed8']);

      svg.selectAll('*').remove();
      const g = svg.selectAll('g')
        .data(bubbleData).enter().append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .style('cursor', 'pointer')
        .on('click', (e, d) => {
          if (useBackendData.value) {
            const sector = props.sectors[d.idx];
            if (sector) {
              currentSector.value = sector;
              modalTitle.value = sector.name + ' - 风口详情';
              modalVisible.value = true;
              nextTick(() => renderFlowChart(sector));
            }
          }
        });

      g.append('circle')
        .attr('r', d => d.r)
        .attr('fill', d => colorScale(d.score))
        .attr('fill-opacity', 0.85)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      g.each(function(d) {
        const name = d.name;
        const maxCharsPerLine = 4;
        const lines = [];
        for (let i = 0; i < name.length; i += maxCharsPerLine) {
          lines.push(name.substring(i, i + maxCharsPerLine));
        }
        const displayLines = lines.slice(0, 2);
        const lineHeight = 13;
        const startY = -(displayLines.length - 1) * lineHeight / 2;
        displayLines.forEach((line, li) => {
          d3.select(this).append('text')
            .attr('y', startY + li * lineHeight)
            .style('font-size', '11px').style('fill', '#fff')
            .style('text-anchor', 'middle').style('dominant-baseline', 'central')
            .style('font-weight', '600').style('pointer-events', 'none')
            .text(line + (li === 1 && lines.length > 2 ? '..' : ''));
        });
      });
    };

    const renderAllBubbleCharts = () => {
      renderBubbleChart(bubbleWrap.value, bubbleSvg.value);
      renderBubbleChart(bubbleWrapSide.value, bubbleSvgSide.value);
    };

    // ===== 层级流向图 =====
    const renderFlowChart = (sector) => {
      if (!flowChartWrap.value || !sector.flow_data) return;
      const container = flowChartWrap.value;
      container.innerHTML = '';
      const { nodes, links } = sector.flow_data;
      const cRect = container.getBoundingClientRect();
      const width = Math.max(cRect.width + 40, 240);
      const svg = d3.select(container).append('svg').attr('width', width).attr('height', 100);
      const defs = svg.append('defs');
      ['#2563eb', '#d97706', '#16a34a'].forEach((color, i) => {
        defs.append('marker').attr('id', `arrow-flow-${i}`)
          .attr('viewBox', '0 0 10 7').attr('refX', 10).attr('refY', 3.5)
          .attr('markerWidth', 6).attr('markerHeight', 4).attr('orient', 'auto')
          .append('polygon').attr('fill', color).attr('points', '0 0, 10 3.5, 0 7');
      });

      const mainNode = nodes.find(n => n.type === 'main');
      const relatedNodes = nodes.filter(n => n.type === 'related');
      const upstreamNodes = nodes.filter(n => n.type === 'upstream');
      const downstreamNodes = nodes.filter(n => n.type === 'downstream');

      const nodeH = 20, charW = 11, padding = 12;
      const nodeWidths = {};
      nodes.forEach(n => {
        const cleanLabel = n.label.replace(/\(A股\)$/, '');
        n._cleanLabel = cleanLabel;
        nodeWidths[n.id] = cleanLabel.length * charW + padding;
      });
      const nw = id => nodeWidths[id] || 56;

      const positions = {};
      const upGroups = {}, downGroups = {};
      relatedNodes.forEach(n => { upGroups[n.id] = []; downGroups[n.id] = []; });
      links.forEach(link => {
        if (link.direction === 'upstream') {
          const rn = relatedNodes.find(n => n.id === link.target);
          const un = upstreamNodes.find(n => n.id === link.source);
          if (rn && un && !upGroups[rn.id].includes(un)) upGroups[rn.id].push(un);
        } else if (link.direction === 'downstream') {
          const rn = relatedNodes.find(n => n.id === link.source);
          const dn = downstreamNodes.find(n => n.id === link.target);
          if (rn && dn && !downGroups[rn.id].includes(dn)) downGroups[rn.id].push(dn);
        }
      });

      const nodeGap = 22, groupGap = 12;
      const relatedSlots = relatedNodes.map(n => Math.max((upGroups[n.id] || []).length, (downGroups[n.id] || []).length, 1));
      const groupHeights = relatedSlots.map(s => s * nodeGap);
      const topY = 16;
      positions[mainNode.id] = { x: width / 2, y: topY };
      let curY = topY + nodeH / 2 + 14;

      relatedNodes.forEach((n, i) => {
        const slotH = groupHeights[i];
        const centerY = curY + slotH / 2;
        positions[n.id] = { x: width / 2, y: centerY };
        (upGroups[n.id] || []).forEach((un, j) => {
          positions[un.id] = { x: width * 0.20, y: centerY + (j - (upGroups[n.id].length - 1) / 2) * nodeGap };
        });
        (downGroups[n.id] || []).forEach((dn, j) => {
          positions[dn.id] = { x: width * 0.80, y: centerY + (j - (downGroups[n.id].length - 1) / 2) * nodeGap };
        });
        curY += slotH + groupGap;
      });

      const contentBottom = Math.max(...Object.values(positions).map(p => p.y)) + nodeH / 2 + 8;
      svg.attr('height', Math.max(contentBottom, 80));

      links.forEach(link => {
        const source = positions[link.source], target = positions[link.target];
        if (!source || !target) return;
        let sx, sy, tx, ty;
        if (link.direction === 'upstream' || link.direction === 'downstream') {
          sx = source.x + nw(link.source) / 2; sy = source.y;
          tx = target.x - nw(link.target) / 2; ty = target.y;
        } else {
          sx = source.x; sy = source.y + nodeH / 2;
          tx = target.x; ty = target.y - nodeH / 2;
        }
        let color = '#94a3b8', arrowIdx = 0;
        if (link.direction === 'upstream') { color = '#d97706'; arrowIdx = 1; }
        else if (link.direction === 'downstream') { color = '#16a34a'; arrowIdx = 2; }
        let path;
        if (link.direction === 'related') { path = `M${sx},${sy} L${tx},${ty}`; }
        else { const midX = (sx + tx) / 2; path = `M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`; }
        svg.append('path').attr('d', path).attr('stroke', color)
          .attr('stroke-width', 1 + link.factor * 1.2).attr('fill', 'none')
          .attr('stroke-opacity', 0.4).attr('marker-end', `url(#arrow-flow-${arrowIdx})`);
        if (link.direction !== 'related') {
          svg.append('text').attr('x', (sx + tx) / 2).attr('y', (sy + ty) / 2 - 3)
            .style('font-size', '9px').style('fill', '#9ca3af').style('text-anchor', 'middle')
            .text(link.factor.toFixed(2));
        }
      });

      nodes.forEach(node => {
        const pos = positions[node.id];
        if (!pos) return;
        const g = svg.append('g').attr('transform', `translate(${pos.x},${pos.y})`);
        let fill, stroke;
        if (node.type === 'main') { fill = '#dbeafe'; stroke = '#2563eb'; }
        else if (node.type === 'related') { fill = '#ede9fe'; stroke = '#7c3aed'; }
        else if (node.type === 'upstream') { fill = '#fffbeb'; stroke = '#d97706'; }
        else { fill = '#f0fdf4'; stroke = '#16a34a'; }
        const w = nw(node.id) + (node.type === 'main' ? 8 : 0);
        const h = node.type === 'main' ? nodeH + 4 : nodeH;
        g.append('rect').attr('x', -w / 2).attr('y', -h / 2).attr('width', w).attr('height', h)
          .attr('fill', fill).attr('stroke', stroke).attr('rx', 4).attr('ry', 4).attr('stroke-width', 1.5);
        g.append('text').attr('x', 0).attr('y', 1).style('font-size', '11px').style('fill', '#1f2937')
          .style('text-anchor', 'middle').style('dominant-baseline', 'central').style('font-weight', '600')
          .text(node._cleanLabel || node.label);
      });
    };

    watch(() => displayBubbles.value, () => { nextTick(renderAllBubbleCharts); }, { deep: true });

    onMounted(() => {
      nextTick(renderAllBubbleCharts);
      // 观察两个泡泡图容器
      [bubbleWrap, bubbleWrapSide].forEach(refObj => {
        if (refObj.value && typeof ResizeObserver !== 'undefined') {
          const obs = new ResizeObserver(() => { nextTick(renderAllBubbleCharts); });
          obs.observe(refObj.value);
          bubbleObservers.push(obs);
        }
      });
      // 观察面板容器尺寸变化（布局切换时触发重绘）
      const panelEl = document.querySelector('.hot-sector-panel');
      if (panelEl && typeof ResizeObserver !== 'undefined') {
        panelResizeObserver = new ResizeObserver(() => {
          nextTick(renderAllBubbleCharts);
        });
        panelResizeObserver.observe(panelEl);
      }
      window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      bubbleObservers.forEach(obs => obs.disconnect());
      bubbleObservers = [];
      if (panelResizeObserver) { panelResizeObserver.disconnect(); panelResizeObserver = null; }
    });

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderAllBubbleCharts, 150);
    };

    const goToHistoryPerformance = () => {
      router.push('/potential-push-history');
    };

    return {
      router,
      bubbleWrap, bubbleSvg, bubbleWrapSide, bubbleSvgSide, flowChartWrap,
      modalVisible, modalTitle, currentSector,
      displayStocks, displayBubbles, displayUpdateTime,
      formatChange, formatNetInflow, getMarketCode,
      isLoggedIn, isFollowed, toggleFollow, followLoading, goToStockByCode, goToHistoryPerformance,
    };
  },
};
</script>

<style scoped>
.hot-sector-panel {
  margin-bottom: 20px;
  background: transparent;
  padding: 0;
}

.hs-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 0 10px; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;
}
.hs-header .section-title { font-size: 1.4rem; font-weight: 500; color: var(--text-primary); margin: 0; }
.hs-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.hs-header-meta { font-size: 12px; color: #9ca3af; white-space: nowrap; }
.hs-history-btn { font-weight: 600; }

/* 主体布局：左侧卡片 + 右侧泡泡图 */
.hs-body {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

/* 左侧卡片区域 */
.hs-cards-area {
  flex: 1;
  min-width: 0;
}

.hs-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* 龙头股卡片（同热门股票样式） */
.hs-stock-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.hs-stock-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.hs-card-info {
  margin-bottom: 8px;
}

.hs-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 6px;
  min-width: 0;
}

.hs-card-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-color, #1a56db);
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
}

.hs-card-industry {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 3px;
  background: #eff6ff;
  color: #2563eb;
  flex-shrink: 1;
  min-width: 0;
  max-width: 120px;
  text-align: center;
  /* 仅在空间不足时换行，不强制断词 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.hs-card-code {
  color: var(--text-secondary, #6b7280);
  font-size: 0.85rem;
  margin-bottom: 8px;
}

.hs-market-code {
  font-size: 0.7rem;
  font-weight: bold;
  color: #1677ff;
  margin-right: 4px;
  padding: 1px 4px;
  border: 1px solid #d6e4ff;
  background-color: #f0f5ff;
  border-radius: 3px;
  display: inline-block;
}

.hs-card-metrics {
  display: flex;
  justify-content: space-between;
}

.hs-metric {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.hs-metric-label {
  color: var(--text-tertiary, #9ca3af);
  font-size: 0.75rem;
  margin-bottom: 2px;
}

.hs-metric-value {
  font-size: 1rem;
  font-weight: 600;
}

.hs-metric-value.up { color: #f56c6c; }
.hs-metric-value.down { color: #67c23a; }

.hs-card-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.hs-card-actions .el-button {
  flex: 1;
  font-size: 12px;
}

/* 泡泡图区域 */
.hs-bubble-area {
  flex-shrink: 0;
}

/* 宽屏：右侧泡泡图（默认显示） */
.hs-bubble-area-side {
  display: block;
}
/* 窄屏：上方泡泡图（默认隐藏） */
.hs-bubble-area-top {
  display: none;
}

.hs-bubble-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hs-bubble-title {
  font-size: 14px;
  font-weight: 400;
  color: #111827;
  margin-bottom: 8px;
  text-align: center;
}

/* 宽屏：侧边泡泡图固定宽高 */
.hs-bubble-area-side .hs-bubble-wrap {
  width: 280px;
  height: 100%;
  min-height: 280px;
  position: relative;
  overflow: hidden;
  flex: 1;
}

.hs-bubble-wrap svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* 二级弹窗 */
:deep(.hs-modal-dialog .el-dialog) { border-radius: 12px; max-width: 900px; }
:deep(.hs-modal-dialog .el-dialog__body) { padding: 0; max-height: 70vh; overflow-y: auto; }
.hs-sector-row { display: flex; align-items: stretch; }
.hs-sector-left {
  flex: 0 0 320px; padding: 12px 14px;
  border-right: 1px solid #f0f0f0;
  display: flex; flex-direction: column; gap: 6px;
}
.hs-sector-header { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.hs-sector-name { font-size: 15px; font-weight: 700; color: #111827; }
.hs-sector-badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: 600; }
.badge-hot { background: #fef2f2; color: #dc2626; }
.hs-sector-stats { display: flex; gap: 10px; font-size: 12px; }
.hs-stat-item { text-align: center; }
.hs-stat-label { color: #9ca3af; font-size: 10px; }
.hs-stat-value { font-weight: 600; font-size: 12px; }
.hs-stat-value.up { color: #dc2626; }
.hs-stat-value.down { color: #16a34a; }
.hs-transfer-info { padding: 5px 8px; background: #f8fafc; border-radius: 4px; font-size: 11px; color: #6b7280; line-height: 1.5; }
.hs-transfer-info .hs-label { color: #2563eb; font-weight: 600; }
.hs-sector-right { flex: 1; padding: 12px 14px; display: flex; flex-direction: column; gap: 0; min-width: 0; overflow-y: auto; }
.hs-stock-group { margin-bottom: 8px; }
.hs-stock-group-label { font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 3px; display: flex; align-items: center; gap: 4px; padding-bottom: 2px; border-bottom: 1px solid #f0f0f0; }
.hs-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
.dot-main { background: #dc2626; }
.dot-up { background: #d97706; }
.dot-down { background: #16a34a; }
.hs-persistence-tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 4px; }
.persistence-short { background: #fffbeb; color: #d97706; }
.persistence-mid { background: #eff6ff; color: #2563eb; }
.persistence-long { background: #f0fdf4; color: #16a34a; }
.hs-flow-chart { width: calc(100% + 40px); height: auto; min-height: 80px; overflow-x: auto; display: flex; justify-content: center; margin-left: -20px; }
.hs-detail-stock-table { width: 100%; font-size: 11px; }
.hs-detail-thead { display: grid; grid-template-columns: minmax(50px, 10%) minmax(80px, 22%) minmax(45px, 10%) minmax(50px, 10%) 1fr; color: #9ca3af; font-weight: 500; font-size: 10px; padding: 2px 4px 3px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
.hs-detail-thead .col-price { text-align: right; }
.hs-detail-thead .col-pnl { text-align: center; }
.hs-detail-row { display: grid; grid-template-columns: minmax(50px, 10%) minmax(80px, 22%) minmax(45px, 10%) minmax(50px, 10%) 1fr; padding: 3px 4px; border-bottom: 1px solid #f8f8f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hs-detail-row:hover { background: #f9fafb; }
.hs-detail-row.clickable { cursor: pointer; }
.hs-detail-row.clickable:hover { background: #eef2ff; }
.hs-detail-name { font-weight: 600; color: #111827; }
.hs-detail-industry { display: flex; align-items: center; gap: 2px; min-width: 0; overflow: hidden; }
.hs-industry-tag { font-size: 10px; color: #2563eb; padding: 0px 3px; background: #eff6ff; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1; min-width: 0; }
.hs-concept-tag { font-size: 10px; color: #dc2626; padding: 0px 3px; background: #fef2f2; border-radius: 3px; flex-shrink: 0; }
.hs-detail-row .col-price { text-align: right; }
.hs-detail-row .col-pnl { text-align: center; }
.pnl-up { color: #dc2626; }
.pnl-down { color: #16a34a; }
.pnl-flat { color: #9ca3af; }
.hs-detail-reason { overflow: hidden; text-overflow: ellipsis; }
.hs-detail-empty { font-size: 11px; color: #d1d5db; padding: 2px 0; }
.hs-risk-tag { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 10px; background: #fef2f2; color: #dc2626; }

/* 响应式 */
@media (max-width: 1100px) {
  .hs-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .hs-body {
    flex-direction: column;
  }
  /* 窄屏：上方泡泡图显示，侧边泡泡图隐藏 */
  .hs-bubble-area-top {
    display: block;
    width: 100%;
  }
  .hs-bubble-area-side {
    display: none;
  }
  /* 窄屏：泡泡图宽度等于画布宽度 */
  .hs-bubble-area-top .hs-bubble-wrap {
    width: 100%;
    height: 280px;
  }
  .hs-bubble-area-top .hs-bubble-card {
    height: auto;
  }
  .hs-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hs-sector-row { flex-direction: column; }
  .hs-sector-left { flex: none; width: 100%; border-right: none; border-bottom: 1px solid #f0f0f0; }
}

@media (max-width: 520px) {
  .hs-cards-grid {
    grid-template-columns: 1fr;
  }
  .hs-bubble-area-top .hs-bubble-wrap {
    width: 100%;
    height: 280px;
  }
}
</style>
