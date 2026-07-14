<template>
  <div class="trend-score-view">
    <!-- 左侧边栏 -->
    <aside class="sidebar">
      <div class="search-box">
        <input v-model="searchInput" placeholder="输入股票代码或名称" @keyup.enter="handleSearch" />
        <button @click="handleSearch">搜索</button>
      </div>
      <button class="batch-btn" @click="handleBatchScore" :disabled="batchLoading">
        {{ batchLoading ? '评分中...' : '一键评分 Top30' }}
      </button>
      <div class="stock-list">
        <div
          v-for="item in stockList"
          :key="item.symbol"
          class="stock-item"
          :class="{ active: item.symbol === currentSymbol }"
          @click="selectStock(item.symbol)"
        >
          <div class="stock-info">
            <span class="stock-symbol">{{ item.symbol }}</span>
            <span class="stock-name">{{ item.name || '--' }}</span>
          </div>
          <div class="stock-score">
            <span class="score-label" :style="{ color: getScoreColor(item.score) }">{{ item.label || '--' }}</span>
            <span class="score-value" :style="{ color: getScoreColor(item.score) }">{{ item.score || '--' }}</span>
          </div>
        </div>
        <div v-if="!stockList.length" class="empty-hint">暂无评分数据</div>
      </div>
    </aside>

    <!-- 右侧主区域 -->
    <main class="main-area">
      <template v-if="scoreData">
        <!-- 评分总览 -->
        <div class="overview-card">
          <div class="score-ring">
            <svg viewBox="0 0 150 150" width="130" height="130" style="transform:rotate(-90deg)">
              <circle cx="75" cy="75" r="65" fill="none" stroke="#e4e7ed" stroke-width="6" />
              <circle cx="75" cy="75" r="65" fill="none" :stroke="getScoreColor(scoreData.score)"
                stroke-width="6" stroke-linecap="round"
                :stroke-dasharray="408.4"
                :stroke-dashoffset="408.4 * (1 - scoreData.score / 100)"
                class="score-ring-fill" />
            </svg>
            <div class="score-ring-center">
              <span class="score-ring-value" :style="{ color: getScoreColor(scoreData.score) }">
                {{ scoreData.score.toFixed(1) }}
              </span>
              <span class="score-ring-label">{{ scoreData.label }}</span>
            </div>
          </div>
          <div class="overview-info">
            <h2>{{ currentSymbol }} 趋势股评分</h2>
            <p class="expected-multiple">预期倍数：{{ scoreData.expectedMultiple }}</p>
            <p class="description">{{ scoreData.description }}</p>
          </div>
          <TrendRadarChart :dimensions="radarData" :size="200" />
        </div>

        <!-- 维度条形图 -->
        <div class="dim-bars">
          <div class="dim-bar-row" v-for="(dim, i) in scoreData.dimensions" :key="i">
            <span class="dim-bar-name">{{ dim.name }}（{{ dim.weight }}%）</span>
            <div class="dim-bar-track">
              <div class="dim-bar-progress" :style="{ width: dim.score + '%', background: getScoreColor(dim.score) }"></div>
            </div>
            <span class="dim-bar-score" :style="{ color: getScoreColor(dim.score) }">{{ dim.score }}</span>
          </div>
        </div>

        <!-- 4维度卡片 -->
        <TrendDimCard
          v-for="(dim, i) in scoreData.dimensions"
          :key="'dim-' + i"
          :name="dim.name"
          :weight="dim.weight"
          :score="dim.score"
          :indicators="dim.indicators"
          :is-open="expandedDims.has(i)"
          @toggle="toggleDim(i)"
        >
          <!-- 技术面展开 -->
          <template v-if="dim.name === '技术面' && dim.detail">
            <TrendKlineCompare
              :stock-kline="dim.detail.kline"
              :concept-kline="dim.detail.conceptKline || { name: '', dates: [], close: [] }"
            />
            <div class="tech-indicators">
              <div class="tech-ind-card">
                <span class="tech-label">低点以来涨幅</span>
                <span class="tech-value" :style="{ color: dim.detail.indicators.lowPointGain >= 100 ? '#67c23a' : '#909399' }">
                  +{{ dim.detail.indicators.lowPointGain.toFixed(1) }}%
                </span>
              </div>
              <div class="tech-ind-card">
                <span class="tech-label">60日线位置</span>
                <span class="tech-value">{{ dim.detail.indicators.ma60Position === 'above' ? '上方' : '下方' }} / {{ dim.detail.indicators.ma60Trend === 'up' ? '向上' : dim.detail.indicators.ma60Trend === 'flat' ? '走平' : '向下' }}</span>
              </div>
              <div class="tech-ind-card">
                <span class="tech-label">创新高状态</span>
                <span class="tech-value" :style="{ color: dim.detail.indicators.isNewHigh250 ? '#67c23a' : '#909399' }">
                  {{ dim.detail.indicators.isNewHigh250 ? '250日新高 ✓' : dim.detail.indicators.isNewHigh120 ? '120日新高 ✓' : '未创新高' }}
                </span>
              </div>
              <div class="tech-ind-card">
                <span class="tech-label">最大回撤</span>
                <span class="tech-value">{{ dim.detail.indicators.maxDrawdown.toFixed(1) }}%</span>
              </div>
            </div>
          </template>

          <!-- 赛道景气展开 -->
          <template v-if="dim.name === '行业赛道景气' && dim.detail">
            <div class="sector-stat">
              <span class="sector-name">板块「{{ dim.detail.sectorName }}」</span>
              <span class="sector-count">近60日上榜 <strong>{{ dim.detail.sectorListCount60d }}</strong> 次</span>
            </div>
            <div class="sector-desc">该指标反映个股所处赛道在近60日内的市场热度。</div>
          </template>

          <!-- 消息面展开 -->
          <template v-if="dim.name === '消息面催化' && dim.detail">
            <div class="news-info">
              <div class="news-stat">机构调研家数：<strong>{{ dim.detail.researchCount }}</strong></div>
              <div class="news-stat" v-if="dim.detail.hardCatalyst">硬催化：{{ dim.detail.hardCatalyst }}</div>
            </div>
            <div class="news-list" v-if="dim.detail.news && dim.detail.news.length">
              <div class="news-item" v-for="(news, ni) in dim.detail.news" :key="ni">
                <h4 class="news-title">{{ news.title }}</h4>
                <span class="news-time">{{ news.publishTime }}</span>
              </div>
            </div>
            <div v-else class="news-empty">暂无近期资讯</div>
          </template>

          <!-- 基本面展开：4个子维度 -->
          <template v-if="dim.name === '基本面' && dim.detail">
            <div class="sub-dims-grid">
              <div class="sub-dim-card" v-for="sub in dim.detail.subDimensions" :key="sub.name">
                <div class="sub-dim-head">
                  <span class="sub-dim-name">{{ sub.name }}</span>
                  <span class="sub-dim-weight">权重 {{ sub.weight }}%</span>
                  <span class="sub-dim-score" :style="{ color: getScoreColor(sub.score) }">{{ sub.score }}</span>
                </div>
                <div class="sub-dim-bar">
                  <div class="sub-dim-fill" :style="{ width: sub.score + '%', background: getScoreColor(sub.score) }"></div>
                </div>
                <div class="sub-ind-row" v-for="ind in sub.indicators" :key="ind.key">
                  <span class="sub-ind-name">{{ ind.name }}</span>
                  <span class="sub-ind-value">{{ ind.value }}</span>
                  <div class="sub-ind-bar">
                    <div class="sub-ind-fill" :style="{ width: ind.score + '%', background: getScoreColor(ind.score) }"></div>
                  </div>
                  <span class="sub-ind-score" :style="{ color: getScoreColor(ind.score) }">{{ ind.score }}</span>
                </div>
              </div>
            </div>
          </template>
        </TrendDimCard>
      </template>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <p v-if="loading">正在计算评分，请稍候...</p>
        <p v-else>请在左侧选择股票或搜索股票代码</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { trendApi } from '@/shared/api/api';
import TrendRadarChart from '@/shared/components/TrendRadarChart.vue';
import TrendKlineCompare from '@/shared/components/TrendKlineCompare.vue';
import TrendDimCard from '@/shared/components/TrendDimCard.vue';

const searchInput = ref('');
const currentSymbol = ref('');
const stockList = ref([]);
const scoreData = ref(null);
const loading = ref(false);
const batchLoading = ref(false);
const expandedDims = reactive(new Set());

const radarData = computed(() => {
  if (!scoreData.value?.dimensions) return [];
  return scoreData.value.dimensions.map(d => ({ name: d.name, score: d.score }));
});

function getScoreColor(score) {
  if (score >= 70) return '#67c23a';
  if (score >= 50) return '#e6a23c';
  return '#f56c6c';
}

function toggleDim(i) {
  if (expandedDims.has(i)) expandedDims.delete(i);
  else expandedDims.add(i);
}

async function loadTopStocks() {
  try {
    const res = await trendApi.getTopStocks(30);
    if (res.code === 200 && Array.isArray(res.data)) {
      stockList.value = res.data;
    }
  } catch (e) {
    console.error('loadTopStocks failed:', e);
  }
}

async function selectStock(symbol) {
  currentSymbol.value = symbol;
  loading.value = true;
  scoreData.value = null;
  expandedDims.clear();
  try {
    const res = await trendApi.getDetail(symbol);
    if (res.code === 200 && res.data) {
      if (res.data.vetoed) {
        scoreData.value = null;
        alert(`股票 ${symbol} 未通过一票否决：${res.data.reasons?.join('，')}`);
      } else {
        scoreData.value = res.data;
      }
    }
  } catch (e) {
    console.error('selectStock failed:', e);
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  if (!searchInput.value.trim()) return;
  const input = searchInput.value.trim();
  // 如果输入的是股票代码，直接查询
  if (/^\d{6}$/.test(input)) {
    await selectStock(input);
  } else {
    // 名称搜索：从 stockList 中过滤
    const matched = stockList.value.find(s =>
      s.name && s.name.includes(input)
    );
    if (matched) {
      await selectStock(matched.symbol);
    }
  }
}

async function handleBatchScore() {
  batchLoading.value = true;
  try {
    const symbols = stockList.value.map(s => s.symbol);
    if (!symbols.length) {
      alert('暂无股票可评分');
      return;
    }
    const res = await trendApi.batchRefresh(symbols);
    if (res.code === 200) {
      alert(`批量评分完成：成功${res.data.success}，失败${res.data.failed}`);
      await loadTopStocks();
    }
  } catch (e) {
    console.error('batchScore failed:', e);
  } finally {
    batchLoading.value = false;
  }
}

onMounted(() => {
  loadTopStocks();
});
</script>

<style scoped>
.trend-score-view {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
}
.sidebar {
  width: 280px;
  border-right: 1px solid #e4e7ed;
  padding: 16px;
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}
.search-box { display: flex; gap: 6px; margin-bottom: 12px; }
.search-box input {
  flex: 1; padding: 8px 12px; border: 1px solid #dcdfe6;
  border-radius: 4px; font-size: 0.9rem;
}
.search-box button {
  padding: 8px 14px; background: #409eff; color: #fff;
  border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;
}
.batch-btn {
  width: 100%; padding: 10px; margin-bottom: 12px;
  background: #67c23a; color: #fff; border: none;
  border-radius: 4px; cursor: pointer; font-size: 0.85rem;
}
.batch-btn:disabled { background: #a0cfff; cursor: not-allowed; }
.stock-list { display: flex; flex-direction: column; gap: 4px; }
.stock-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 6px; cursor: pointer;
  transition: background 0.2s;
}
.stock-item:hover { background: #f5f7fa; }
.stock-item.active { background: #ecf5ff; }
.stock-info { display: flex; flex-direction: column; }
.stock-symbol { font-size: 0.9rem; font-weight: 600; color: #303133; }
.stock-name { font-size: 0.8rem; color: #909399; }
.stock-score { display: flex; align-items: center; gap: 6px; }
.score-label { font-size: 0.75rem; font-weight: 700; }
.score-value { font-size: 1rem; font-weight: 700; }
.empty-hint { text-align: center; color: #909399; padding: 20px; font-size: 0.85rem; }

.main-area { flex: 1; padding: 20px; overflow-y: auto; }
.overview-card {
  display: flex; align-items: center; gap: 24px;
  background: #fff; border: 1px solid #e4e7ed;
  border-radius: 12px; padding: 20px; margin-bottom: 16px;
}
.score-ring { position: relative; flex-shrink: 0; }
.score-ring-fill { transition: stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1); }
.score-ring-center {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
.score-ring-value { display: block; font-size: 1.8rem; font-weight: 700; }
.score-ring-label { display: block; font-size: 1rem; color: #909399; }
.overview-info { flex: 1; }
.overview-info h2 { margin: 0 0 8px; font-size: 1.2rem; color: #303133; }
.expected-multiple { font-size: 0.95rem; color: #409eff; margin: 0 0 6px; }
.description { font-size: 0.9rem; color: #606266; margin: 0; line-height: 1.5; }

.dim-bars {
  background: #fff; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 16px; margin-bottom: 16px;
}
.dim-bar-row {
  display: flex; align-items: center; gap: 12px;
  padding: 6px 0;
}
.dim-bar-name { font-size: 0.85rem; color: #606266; min-width: 130px; }
.dim-bar-track { flex: 1; height: 8px; background: #f0f2f5; border-radius: 4px; overflow: hidden; }
.dim-bar-progress { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
.dim-bar-score { font-size: 1rem; font-weight: 700; min-width: 30px; text-align: right; }

.empty-state {
  display: flex; align-items: center; justify-content: center;
  height: 400px; color: #909399; font-size: 1rem;
}

/* 技术面展开 */
.tech-indicators {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 12px; margin-top: 16px;
}
.tech-ind-card {
  display: flex; flex-direction: column; gap: 4px;
  padding: 12px; background: #f5f7fa; border-radius: 8px;
}
.tech-label { font-size: 0.8rem; color: #909399; }
.tech-value { font-size: 1.1rem; font-weight: 600; color: #303133; }
@media (max-width: 768px) { .tech-indicators { grid-template-columns: repeat(2, 1fr); } }

/* 赛道景气展开 */
.sector-stat { font-size: 1rem; margin-bottom: 8px; }
.sector-name { color: #303133; font-weight: 600; margin-right: 12px; }
.sector-count { color: #606266; }
.sector-count strong { color: #409eff; font-size: 1.2rem; }
.sector-desc { font-size: 0.85rem; color: #909399; }

/* 消息面展开 */
.news-info { margin-bottom: 12px; }
.news-stat { font-size: 0.9rem; color: #606266; margin-bottom: 4px; }
.news-stat strong { color: #303133; }
.news-list { margin-top: 8px; }
.news-item { padding: 10px 0; border-bottom: 1px solid #f5f7fa; }
.news-item:last-child { border-bottom: none; }
.news-title { font-size: 0.9rem; color: #303133; margin: 0 0 4px; }
.news-time { font-size: 0.8rem; color: #909399; }
.news-empty { color: #909399; font-size: 0.85rem; padding: 16px 0; }

/* 基本面子维度展开 */
.sub-dims-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 16px; margin-top: 12px;
}
.sub-dim-card {
  border: 1px solid #ebeef5; border-radius: 8px; padding: 12px;
}
.sub-dim-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sub-dim-name { font-size: 0.95rem; font-weight: 600; color: #303133; }
.sub-dim-weight { font-size: 0.75rem; color: #909399; }
.sub-dim-score { font-size: 1.1rem; font-weight: 700; margin-left: auto; }
.sub-dim-bar { height: 6px; background: #f0f2f5; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
.sub-dim-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
.sub-ind-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 0;
}
.sub-ind-name { font-size: 0.8rem; color: #606266; min-width: 110px; }
.sub-ind-value { font-size: 0.8rem; color: #303133; min-width: 60px; }
.sub-ind-bar { flex: 1; height: 4px; background: #f0f2f5; border-radius: 2px; overflow: hidden; }
.sub-ind-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
.sub-ind-score { font-size: 0.8rem; font-weight: 600; min-width: 22px; text-align: right; }
@media (max-width: 768px) { .sub-dims-grid { grid-template-columns: 1fr; } }
</style>
