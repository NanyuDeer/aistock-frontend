<template>
  <div class="stock-chart-section">
    <div class="chart-header">
      <div class="chart-header-main">
        <div class="title-group">
          <h3 class="section-title">技术面</h3>
          <span class="adjustment-tag">前复权</span>
        </div>
        <div class="signal-row">
          <span class="signal-text">
            技术面预测今日决策信号为
            <strong :class="['signal-value', `is-${predictionSignal}`]">{{ predictionSignalText }}</strong>
          </span>
          <div class="signal-progress" :aria-label="`决策概率 ${predictionProbabilityPercentText}`">
            <span class="signal-progress-fill" :style="predictionProbabilityStyle"></span>
          </div>
          <span class="signal-probability">{{ predictionProbabilityPercentText }}</span>
        </div>
        <p v-if="predictionLoading && predictionStatusText" class="prediction-status">{{ predictionStatusText }}</p>
        <p v-if="predictionError" class="prediction-error">{{ predictionError }}</p>
      </div>
      <div class="period-switch">
        <button
          v-for="option in periodOptions"
          :key="option.klt"
          type="button"
          class="period-button"
          :class="{ 'is-active': selectedKlt === option.klt }"
          @click="handlePeriodChange(option.klt)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="stock-chart-wrap">
      <div class="stock-chart" ref="chartContainer"></div>
      <div v-if="showPredictionPlaceholder" class="prediction-loading-mask" role="status" aria-live="polite">
        <span class="loading-title">技术面预测加载中</span>
        <span class="loading-desc">{{ predictionStatusText || '模型推理中，结果将自动刷新' }}</span>
      </div>
    </div>

    <div v-if="klineItems.length > 1" class="chart-range-slider">
      <el-slider
        v-model="zoomRange"
        range
        :min="0"
        :max="100"
        :step="1"
        :show-tooltip="false"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import { useStore } from 'vuex';
import { stockApi } from '@/services/api';
import * as echarts from 'echarts/core';
import { CandlestickChart, LineChart, CustomChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
  MarkPointComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  CandlestickChart,
  LineChart,
  CustomChart,
  TooltipComponent,
  GridComponent,
  MarkPointComponent,
  CanvasRenderer
]);

const PERIOD_OPTIONS = [
  { label: '1', klt: 1 },
  { label: '5', klt: 5 },
  { label: '30', klt: 30 },
  { label: '日线', klt: 101 },
  { label: '周线', klt: 102 },
  { label: '月线', klt: 103 }
];

const UP_COLOR = '#d94848';
const DOWN_COLOR = '#2f9e44';
const PREDICTION_POLL_INTERVAL = 60 * 1000;
const PREDICTION_DEFAULTS = Object.freeze({
  lookback: 256,
  predLen: 5,
  sampleCount: 30,
  mode: 'simple',
  includeVolume: false
});
const SIGNAL_LABEL_MAP = Object.freeze({
  bullish: '看多',
  bearish: '看空'
});

export default {
  name: 'StockChart',
  props: {
    stockCode: {
      type: String,
      required: true
    },
    stockMarket: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const store = useStore();
    const chartContainer = ref(null);
    const chartInstance = ref(null);
    const selectedKlt = ref(101);
    const periodOptions = PERIOD_OPTIONS;
    const klineItems = ref([]);
    const zoomRange = ref([0, 100]);
    const latestRequestId = ref(0);

    const predictionLoading = ref(false);
    const predictionError = ref('');
    const predictionStatusText = ref('');
    const predictionTaskId = ref('');
    const predictionResult = ref(null);
    const latestPredictionRequestId = ref(0);

    let resizeTimer = null;
    let predictionPollTimer = null;

    const toNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const toFiniteNumber = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string' && !value.trim()) return null;
      const normalized = typeof value === 'string'
        ? value.replace(/%/g, '').trim()
        : value;
      const num = Number(normalized);
      return Number.isFinite(num) ? num : null;
    };

    const normalizeProbability = (value) => {
      const parsed = toFiniteNumber(value);
      if (parsed === null) return null;
      const ratio = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
      return Math.max(0, Math.min(1, ratio));
    };

    const normalizeMarketCode = (value) => {
      const raw = String(value || '').trim().toUpperCase();
      if (!raw) return '';
      if (raw.includes('SH')) return 'SH';
      if (raw.includes('SZ')) return 'SZ';
      if (raw.includes('BJ')) return 'BJ';
      return '';
    };

    const inferMarketCode = (code) => {
      const text = String(code || '').trim();
      if (!text) return '';
      if (/^(60|68|90|50|51|52|56|58)/.test(text)) return 'SH';
      if (/^(00|30|20)/.test(text)) return 'SZ';
      if (/^(43|83|87|92)/.test(text)) return 'BJ';
      return '';
    };

    const resolveTsCode = (rawCode, marketHint) => {
      const source = String(rawCode || '').trim().toUpperCase();
      if (!source) return '';
      if (/^\d{6}\.(SH|SZ|BJ)$/.test(source)) {
        return source;
      }
      const digits = source.replace(/\D/g, '').slice(0, 6);
      if (!/^\d{6}$/.test(digits)) {
        return '';
      }
      const market = normalizeMarketCode(marketHint) || inferMarketCode(digits);
      if (!market) return '';
      return `${digits}.${market}`;
    };

    const formatLocalDateTime = (date) => {
      const pad = (value) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const normalizeTime = (time) => {
      if (time == null) return '';
      const raw = String(time).trim();
      if (!raw) return '';
      if (/^\d{10}$/.test(raw)) {
        const date = new Date(Number(raw) * 1000);
        return Number.isNaN(date.getTime()) ? raw : formatLocalDateTime(date);
      }
      if (/^\d{13}$/.test(raw)) {
        const date = new Date(Number(raw));
        return Number.isNaN(date.getTime()) ? raw : formatLocalDateTime(date);
      }
      return raw;
    };

    const formatSigned = (value, digits = 2) => {
      if (!Number.isFinite(value)) return '--';
      const formatted = value.toLocaleString('zh-CN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
      return `${value > 0 ? '+' : ''}${formatted}`;
    };

    const formatPercent = (value) => {
      if (!Number.isFinite(value)) return '--';
      return `${formatSigned(value, 2)}%`;
    };

    const formatRatioPercent = (value, digits = 1) => {
      if (!Number.isFinite(value)) return '--';
      return `${(value * 100).toFixed(digits)}%`;
    };

    const formatPrice = (value) => {
      if (!Number.isFinite(value)) return '--';
      return value.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const formatVolume = (value) => {
      if (!Number.isFinite(value)) return '--';
      if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
      if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
      return `${Math.round(value)}`;
    };

    const formatAxisLabel = (value) => {
      const str = String(value || '');
      if (!str) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str.slice(5);
      }
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
        return `${str.slice(5, 10)} ${str.slice(11, 16)}`;
      }
      return str;
    };

    const getConfidenceRatio = (uncertainty) => {
      const safe = Number.isFinite(uncertainty) ? Math.max(0, uncertainty) : 0;
      return Math.max(0, Math.min(1, 1 - safe / 0.2));
    };

    const getRangeOpacity = (uncertainty) => {
      const confidence = getConfidenceRatio(uncertainty);
      return 0.12 + confidence * 0.6;
    };

    const predictionTsCode = computed(() => resolveTsCode(props.stockCode, props.stockMarket));

    const predictionBands = computed(() => {
      const bands = predictionResult.value?.bands;
      return Array.isArray(bands) ? bands : [];
    });

    const predictionSignal = computed(() => {
      const signal = String(predictionResult.value?.direction?.signal || '').toLowerCase();
      if (signal === 'bullish' || signal === 'bearish') return signal;
      return 'neutral';
    });

    const predictionSignalText = computed(() => {
      if (predictionLoading.value && predictionBands.value.length === 0) {
        return '加载中';
      }
      if (predictionError.value && predictionBands.value.length === 0) {
        return '暂无';
      }
      return SIGNAL_LABEL_MAP[predictionSignal.value] || '观望';
    });

    const predictionProbability = computed(() => {
      const probability = normalizeProbability(predictionResult.value?.direction?.probability);
      if (probability === null) return null;
      return probability;
    });

    const predictionProbabilityPercentText = computed(() => {
      if (predictionProbability.value === null) return '--';
      return `${(predictionProbability.value * 100).toFixed(1)}%`;
    });

    const predictionProbabilityStyle = computed(() => {
      const percent = predictionProbability.value === null ? 0 : predictionProbability.value * 100;
      const color = predictionSignal.value === 'bullish'
        ? '#dc2626'
        : predictionSignal.value === 'bearish'
          ? '#16a34a'
          : '#64748b';
      return {
        width: `${percent}%`,
        background: `linear-gradient(90deg, ${color}, ${color}cc)`
      };
    });

    const showPredictionPlaceholder = computed(() => {
      return predictionLoading.value && predictionBands.value.length === 0 && klineItems.value.length > 0;
    });

    const renderEmpty = (message) => {
      if (!chartInstance.value) return;
      chartInstance.value.setOption(
        {
          animation: false,
          xAxis: { show: false },
          yAxis: { show: false },
          series: [],
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: message,
              fill: '#9ca3af',
              fontSize: 14
            }
          }
        },
        true
      );
    };

    const getVisibleItems = () => {
      const items = klineItems.value;
      if (!items.length) return [];
      const total = items.length;
      const startRaw = Array.isArray(zoomRange.value) ? Number(zoomRange.value[0]) : 0;
      const endRaw = Array.isArray(zoomRange.value) ? Number(zoomRange.value[1]) : 100;
      const startPercent = Math.max(0, Math.min(100, Number.isFinite(startRaw) ? startRaw : 0));
      const endPercent = Math.max(0, Math.min(100, Number.isFinite(endRaw) ? endRaw : 100));
      let startIndex = Math.floor(startPercent / 100 * total);
      let endIndex = Math.ceil(endPercent / 100 * total);
      if (endIndex <= startIndex) {
        endIndex = Math.min(total, startIndex + 1);
      }
      return items.slice(startIndex, endIndex);
    };

    const parsePredictionResponse = (payload, depth = 0) => {
      if (depth > 4) {
        return { status: 'failed', error: '预测响应层级过深' };
      }
      if (!payload || typeof payload !== 'object') {
        return { status: 'failed', error: '预测响应为空' };
      }

      const body = payload.code && payload.data && typeof payload.data === 'object'
        ? payload.data
        : payload;

      if (body.status === 'done') {
        if (body.result && typeof body.result === 'object') {
          return parsePredictionResponse(body.result, depth + 1);
        }
        if (body.data && typeof body.data === 'object') {
          return parsePredictionResponse(body.data, depth + 1);
        }
        return { status: 'failed', error: '预测任务完成但缺少 result' };
      }

      if (body.status === 'pending') {
        return {
          status: 'pending',
          taskId: body.task_id || body.taskId || body.id || ''
        };
      }

      if (body.status === 'failed') {
        const errorText = typeof body.error === 'string'
          ? body.error
          : body.error?.message;
        return {
          status: 'failed',
          error: errorText || body.message || '预测任务执行失败'
        };
      }

      if (body.result && typeof body.result === 'object') {
        return parsePredictionResponse(body.result, depth + 1);
      }

      if (Array.isArray(body.bands) || body.summary || body.direction) {
        return {
          status: 'done',
          result: body
        };
      }

      if (body.task_id || body.taskId || body.id) {
        return {
          status: 'pending',
          taskId: body.task_id || body.taskId || body.id || ''
        };
      }

      if (body.data && typeof body.data === 'object') {
        return parsePredictionResponse(body.data, depth + 1);
      }

      return {
        status: 'failed',
        error: body.message || '预测返回格式不支持'
      };
    };

    const hasPredictionFields = (payload) => {
      if (!payload || typeof payload !== 'object') return false;
      return Array.isArray(payload.bands)
        || !!payload.summary
        || !!payload.direction
        || !!payload.ts_code
        || !!payload.tsCode;
    };

    const unwrapPredictionPayload = (payload, depth = 0) => {
      if (!payload || typeof payload !== 'object' || depth > 6) return payload;
      if (hasPredictionFields(payload)) return payload;
      if (payload.result && typeof payload.result === 'object') {
        return unwrapPredictionPayload(payload.result, depth + 1);
      }
      if (payload.data && typeof payload.data === 'object') {
        return unwrapPredictionPayload(payload.data, depth + 1);
      }
      return payload;
    };

    const normalizePredictionResult = (result) => {
      const sourceRaw = result && typeof result === 'object' ? result : {};
      const source = unwrapPredictionPayload(sourceRaw);
      const summary = source.summary && typeof source.summary === 'object' ? source.summary : {};
      const rawBands = Array.isArray(source.bands) ? source.bands : [];
      const rawDirection = source.direction && typeof source.direction === 'object'
        ? source.direction
        : {};

      const bands = rawBands
        .map((item, index) => {
          const row = item && typeof item === 'object' ? item : {};
          const stepValue = Number(row.step);
          const step = Number.isFinite(stepValue) && stepValue > 0 ? stepValue : index + 1;
          const date = String(row.date || '').trim();

          const meanClose = toFiniteNumber(row.mean_close ?? row.meanClose);
          const lowRaw = toFiniteNumber(row.trading_low ?? row.range_low ?? row.close_ci_low);
          const highRaw = toFiniteNumber(row.trading_high ?? row.range_high ?? row.close_ci_high);

          const fallback = meanClose ?? 0;
          const low = lowRaw ?? meanClose ?? fallback;
          const high = highRaw ?? meanClose ?? fallback;
          const tradingLow = Math.min(low, high);
          const tradingHigh = Math.max(low, high);

          const uncertaintyRaw = toFiniteNumber(row.uncertainty);
          const estimatedUncertainty = (tradingHigh - tradingLow) / Math.max(Math.abs(meanClose ?? fallback), 0.01);
          const uncertainty = Math.max(0, uncertaintyRaw ?? estimatedUncertainty);

          return {
            step,
            date,
            meanClose: meanClose ?? ((tradingLow + tradingHigh) / 2),
            tradingLow,
            tradingHigh,
            uncertainty
          };
        })
        .filter(item => Number.isFinite(item.meanClose))
        .sort((a, b) => a.step - b.step);

      return {
        tsCode: String(source.ts_code || source.tsCode || ''),
        baseDate: String(source.base_date || source.baseDate || ''),
        predLen: Number(source.pred_len || source.predLen || bands.length || 0),
        cached: !!source.cached,
        cacheExpiresAt: String(source.cache_expires_at || source.cacheExpiresAt || ''),
        direction: {
          signal: String(rawDirection.signal || source.signal || '').toLowerCase(),
          probability: normalizeProbability(
            rawDirection.probability
            ?? rawDirection.confidence
            ?? source.direction_probability
            ?? source.probability
          )
        },
        summary: {
          meanClose: toFiniteNumber(summary.mean_close ?? summary.meanClose),
          rangeLow: toFiniteNumber(summary.range_low ?? summary.rangeLow),
          rangeHigh: toFiniteNumber(summary.range_high ?? summary.rangeHigh)
        },
        bands
      };
    };

    const clearPredictionPollTimer = () => {
      if (predictionPollTimer) {
        clearTimeout(predictionPollTimer);
        predictionPollTimer = null;
      }
    };

    const finishPredictionWithError = (message) => {
      clearPredictionPollTimer();
      predictionLoading.value = false;
      predictionTaskId.value = '';
      predictionError.value = message || '价格预测失败';
      predictionStatusText.value = '';
      renderChart();
    };

    const applyPredictionResult = (rawResult) => {
      const normalized = normalizePredictionResult(rawResult);
      if (!normalized.bands.length) {
        throw new Error('预测结果为空');
      }
      clearPredictionPollTimer();
      predictionResult.value = normalized;
      predictionError.value = '';
      predictionLoading.value = false;
      predictionTaskId.value = '';
      predictionStatusText.value = normalized.cached
        ? '已读取缓存预测结果'
        : '预测结果已更新';
      renderChart();
    };

    const schedulePredictionPoll = (taskId, requestId) => {
      clearPredictionPollTimer();
      predictionPollTimer = setTimeout(() => {
        pollPredictionTask(taskId, requestId);
      }, PREDICTION_POLL_INTERVAL);
    };

    const pollPredictionTask = async (taskId, requestId) => {
      if (!taskId || requestId !== latestPredictionRequestId.value) return;

      try {
        const response = await stockApi.getPricePredictionTask(taskId);
        if (requestId !== latestPredictionRequestId.value) return;

        const parsed = parsePredictionResponse(response);
        if (parsed.status === 'done') {
          applyPredictionResult(parsed.result);
          return;
        }

        if (parsed.status === 'failed') {
          finishPredictionWithError(parsed.error || '预测任务失败');
          return;
        }

        predictionStatusText.value = '预测任务处理中，1分钟后自动刷新...';
        schedulePredictionPoll(taskId, requestId);
      } catch (error) {
        if (requestId !== latestPredictionRequestId.value) return;
        console.error('轮询预测任务失败:', error);
        predictionStatusText.value = '轮询失败，1分钟后重试...';
        schedulePredictionPoll(taskId, requestId);
      }
    };

    const hasMatchingCacheEntry = (cacheResponse, requestPayload) => {
      const entries = Array.isArray(cacheResponse?.entries) ? cacheResponse.entries : [];
      return entries.some((entry) => {
        const tsCode = String(entry?.ts_code || '').trim().toUpperCase();
        if (tsCode !== requestPayload.tsCode.toUpperCase()) return false;

        const lookback = Number(entry?.lookback);
        const predLen = Number(entry?.pred_len);
        const sampleCount = Number(entry?.sample_count);
        const mode = String(entry?.mode || '').trim().toLowerCase();
        const includeVolume = !!entry?.include_volume;

        return lookback === requestPayload.lookback
          && predLen === requestPayload.predLen
          && sampleCount === requestPayload.sampleCount
          && mode === requestPayload.mode
          && includeVolume === requestPayload.includeVolume;
      });
    };

    const fetchPricePrediction = async () => {
      const tsCode = predictionTsCode.value;
      if (!tsCode) {
        predictionLoading.value = false;
        predictionResult.value = null;
        predictionTaskId.value = '';
        predictionStatusText.value = '';
        predictionError.value = '当前股票代码无法映射为预测接口 ts_code';
        renderChart();
        return;
      }

      const requestPayload = {
        tsCode,
        lookback: PREDICTION_DEFAULTS.lookback,
        predLen: PREDICTION_DEFAULTS.predLen,
        sampleCount: PREDICTION_DEFAULTS.sampleCount,
        mode: PREDICTION_DEFAULTS.mode,
        includeVolume: PREDICTION_DEFAULTS.includeVolume
      };

      const requestId = ++latestPredictionRequestId.value;
      clearPredictionPollTimer();

      predictionLoading.value = true;
      predictionResult.value = null;
      predictionTaskId.value = '';
      predictionError.value = '';
      predictionStatusText.value = '正在检查缓存...';
      renderChart();

      let cacheHit = false;

      try {
        const cacheResponse = await stockApi.getPricePredictionCache(tsCode);
        if (requestId !== latestPredictionRequestId.value) return;
        cacheHit = hasMatchingCacheEntry(cacheResponse, requestPayload);
        predictionStatusText.value = cacheHit
          ? '命中缓存，正在读取结果...'
          : '缓存未命中，正在提交预测任务...';
      } catch (error) {
        if (requestId !== latestPredictionRequestId.value) return;
        console.warn('查询预测缓存失败，继续提交任务:', error);
        predictionStatusText.value = '缓存查询失败，正在直接提交任务...';
      }

      try {
        const response = await stockApi.createPricePrediction(requestPayload);
        if (requestId !== latestPredictionRequestId.value) return;

        const parsed = parsePredictionResponse(response);

        if (parsed.status === 'done') {
          applyPredictionResult(parsed.result);
          return;
        }

        if (parsed.status === 'pending') {
          const taskId = String(parsed.taskId || '').trim();
          if (!taskId) {
            finishPredictionWithError('预测任务未返回 task_id');
            return;
          }

          predictionTaskId.value = taskId;
          predictionStatusText.value = cacheHit
            ? '缓存读取超时，已切换任务轮询（每1分钟）'
            : '预测任务已提交，正在轮询（每1分钟）';

          await pollPredictionTask(taskId, requestId);
          return;
        }

        finishPredictionWithError(parsed.error || '预测服务返回异常');
      } catch (error) {
        if (requestId !== latestPredictionRequestId.value) return;
        console.error('提交预测任务失败:', error);
        const message = error?.response?.data?.message || error?.message || '提交预测任务失败';
        finishPredictionWithError(message);
      }
    };

    const renderChart = () => {
      if (!chartInstance.value) return;
      if (!klineItems.value.length) {
        renderEmpty('暂无K线数据');
        return;
      }

      const visibleItems = getVisibleItems();
      if (!visibleItems.length) {
        renderEmpty('暂无K线数据');
        return;
      }

      const realCategories = visibleItems.map(item => item.time);
      const candleData = visibleItems.map(item => [item.open, item.close, item.low, item.high]);

      const shouldShowFutureLoadingSlots = predictionLoading.value && predictionBands.value.length === 0;
      const loadingFutureSlots = shouldShowFutureLoadingSlots
        ? Array.from({ length: PREDICTION_DEFAULTS.predLen }, (_, index) => `预测中${index + 1}`)
        : [];
      const predictedCategories = predictionBands.value.length > 0
        ? predictionBands.value.map((band, index) => band.date || `T+${band.step || index + 1}`)
        : loadingFutureSlots;
      const categories = [...realCategories, ...predictedCategories];

      const visibleHighs = visibleItems.map(item => item.high);
      const visibleLows = visibleItems.map(item => item.low);
      const predictionHighs = predictionBands.value.map(item => item.tradingHigh);
      const predictionLows = predictionBands.value.map(item => item.tradingLow);
      const allHighs = [...visibleHighs, ...predictionHighs].filter(Number.isFinite);
      const allLows = [...visibleLows, ...predictionLows].filter(Number.isFinite);

      const rawMax = allHighs.length ? Math.max(...allHighs) : Math.max(...visibleHighs);
      const rawMin = allLows.length ? Math.min(...allLows) : Math.min(...visibleLows);
      const range = Math.max(rawMax - rawMin, Math.abs(rawMax) * 0.02, 0.01);
      const axisPadding = range * 0.12;
      const axisMin = rawMin - axisPadding;
      const axisMax = rawMax + axisPadding;

      let highestIndex = 0;
      let lowestIndex = 0;
      let highestValue = visibleItems[0].high;
      let lowestValue = visibleItems[0].low;
      for (let i = 1; i < visibleItems.length; i += 1) {
        if (visibleItems[i].high > highestValue) {
          highestValue = visibleItems[i].high;
          highestIndex = i;
        }
        if (visibleItems[i].low < lowestValue) {
          lowestValue = visibleItems[i].low;
          lowestIndex = i;
        }
      }

      const predictionRangeData = predictionBands.value.map((band, index) => {
        const xIndex = realCategories.length + index;
        return {
          value: [xIndex, band.tradingLow, band.tradingHigh, band.meanClose, band.uncertainty],
          band
        };
      });

      const predictionMeanData = [...new Array(realCategories.length).fill(null)];
      const predictionUpperLineData = [...new Array(realCategories.length).fill(null)];
      const predictionLowerLineData = [...new Array(realCategories.length).fill(null)];
      if (predictionBands.value.length > 0) {
        predictionMeanData.push(...predictionBands.value.map((band) => band.meanClose));
        predictionUpperLineData.push(...predictionBands.value.map((band) => band.tradingHigh));
        predictionLowerLineData.push(...predictionBands.value.map((band) => band.tradingLow));
      } else if (loadingFutureSlots.length > 0) {
        predictionMeanData.push(...new Array(loadingFutureSlots.length).fill(null));
        predictionUpperLineData.push(...new Array(loadingFutureSlots.length).fill(null));
        predictionLowerLineData.push(...new Array(loadingFutureSlots.length).fill(null));
      }

      const hasPredictionArea = predictedCategories.length > 0;
      const predictionRangeTone = predictionSignal.value === 'bearish'
        ? '22, 163, 74'
        : predictionSignal.value === 'bullish'
          ? '220, 38, 38'
          : '29, 78, 216';

      chartInstance.value.setOption(
        {
          animation: false,
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross'
            },
            backgroundColor: 'rgba(18, 22, 28, 0.9)',
            borderWidth: 0,
            textStyle: {
              color: '#f5f7fa'
            },
            formatter: (params) => {
              const rows = Array.isArray(params) ? params : [params];
              const candle = rows.find(item => item.seriesName === 'K线');
              if (candle) {
                const row = visibleItems[candle.dataIndex];
                if (!row) return '';
                const isUp = row.close >= row.open;
                const trendColor = isUp ? UP_COLOR : DOWN_COLOR;
                return [
                  `<div style="margin-bottom:6px;font-weight:600;">${row.time}</div>`,
                  `<div>开盘：${formatPrice(row.open)}</div>`,
                  `<div>收盘：<span style="color:${trendColor};font-weight:600;">${formatPrice(row.close)}</span></div>`,
                  `<div>最高：${formatPrice(row.high)}</div>`,
                  `<div>最低：${formatPrice(row.low)}</div>`,
                  `<div>成交量：${formatVolume(row.volume)}</div>`,
                  `<div>涨跌幅：<span style="color:${trendColor};font-weight:600;">${formatPercent(row.changePercent)}</span></div>`,
                  `<div>换手率：${formatPercent(row.turnoverRate)}</div>`
                ].join('');
              }

              const predictionRow = rows.find(item => item.seriesName === '预测区间阴影');
              const axisIndex = Number.isInteger(rows[0]?.dataIndex) ? rows[0].dataIndex : -1;
              const fallbackBand = axisIndex >= realCategories.length
                ? predictionBands.value[axisIndex - realCategories.length]
                : null;
              const band = predictionRow?.data?.band || fallbackBand;
              if (band) {
                const confidence = getConfidenceRatio(band.uncertainty);
                return [
                  `<div style="margin-bottom:6px;font-weight:600;">${band.date || `T+${band.step}`}</div>`,
                  `<div>range_low：${formatPrice(band.tradingLow)}</div>`,
                  `<div>range_high：${formatPrice(band.tradingHigh)}</div>`,
                  `<div>mean_close：<span style="color:#1d4ed8;font-weight:700;">${formatPrice(band.meanClose)}</span></div>`,
                  `<div>置信度：<span style="font-weight:600;">${formatRatioPercent(confidence, 1)}</span></div>`
                ].join('');
              }

              const axisLabel = rows[0]?.axisValueLabel || rows[0]?.axisValue || '';
              if (showPredictionPlaceholder.value && /^预测中\d+$/.test(String(axisLabel))) {
                return [
                  `<div style="margin-bottom:6px;font-weight:600;">${axisLabel}</div>`,
                  '<div>技术面预测加载中...</div>'
                ].join('');
              }

              return '';
            }
          },
          grid: {
            left: '6%',
            right: hasPredictionArea ? '7%' : '4%',
            top: 26,
            bottom: 52
          },
          xAxis: {
            type: 'category',
            data: categories,
            boundaryGap: true,
            axisLine: { lineStyle: { color: '#d0d7e2' } },
            axisTick: { show: false },
            axisLabel: {
              color: '#6b7280',
              formatter: value => formatAxisLabel(value)
            }
          },
          yAxis: {
            scale: true,
            min: axisMin,
            max: axisMax,
            splitNumber: 5,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: '#6b7280',
              formatter: value => formatPrice(toNumber(value))
            },
            splitLine: {
              lineStyle: { color: '#eef1f5' }
            }
          },
          series: [
            {
              name: 'K线',
              type: 'candlestick',
              data: candleData,
              clip: false,
              large: false,
              progressive: 0,
              progressiveThreshold: 0,
              itemStyle: {
                color: UP_COLOR,
                color0: DOWN_COLOR,
                borderColor: UP_COLOR,
                borderColor0: DOWN_COLOR
              },
              markLine: hasPredictionArea && realCategories.length > 0
                ? {
                    symbol: 'none',
                    silent: true,
                    lineStyle: {
                      color: '#94a3b8',
                      width: 1,
                      type: 'dashed'
                    },
                    label: {
                      show: false
                    },
                    data: [{ xAxis: realCategories[realCategories.length - 1] }]
                  }
                : undefined,
              markPoint: {
                symbol: 'circle',
                symbolSize: 6,
                animation: false,
                z: 12,
                label: {
                  show: true,
                  fontSize: 11,
                  color: '#111827',
                  backgroundColor: 'rgba(255, 255, 255, 0.78)',
                  borderColor: '#d1d5db',
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: [2, 5],
                  distance: 14,
                  formatter: (params) => {
                    const value = toNumber(params.value);
                    return `${params.name}：${formatPrice(value)}`;
                  }
                },
                data: [
                  {
                    name: '最高',
                    coord: [realCategories[highestIndex], highestValue],
                    value: highestValue,
                    itemStyle: { color: '#111827' },
                    label: {
                      position: 'top',
                      align: highestIndex < 2 ? 'left' : (highestIndex > realCategories.length - 3 ? 'right' : 'center'),
                      verticalAlign: 'bottom'
                    }
                  },
                  {
                    name: '最低',
                    coord: [realCategories[lowestIndex], lowestValue],
                    value: lowestValue,
                    itemStyle: { color: '#111827' },
                    label: {
                      position: 'bottom',
                      align: lowestIndex < 2 ? 'left' : (lowestIndex > realCategories.length - 3 ? 'right' : 'center'),
                      verticalAlign: 'top'
                    }
                  }
                ]
              }
            },
            ...(predictionRangeData.length > 0
              ? [
                  {
                    name: '预测区间阴影',
                    type: 'custom',
                    z: 4,
                    encode: {
                      x: 0,
                      y: [1, 2]
                    },
                    data: predictionRangeData,
                    renderItem: (params, api) => {
                      const xIndex = api.value(0);
                      const low = api.value(1);
                      const high = api.value(2);
                      const uncertainty = api.value(4);
                      const center = api.coord([xIndex, (low + high) / 2]);
                      const highPoint = api.coord([xIndex, high])[1];
                      const lowPoint = api.coord([xIndex, low])[1];
                      const top = Math.min(highPoint, lowPoint);
                      const height = Math.max(2, Math.abs(lowPoint - highPoint));
                      const halfWidth = Math.max(7, Math.min(18, api.size([1, 0])[0] * 0.34));
                      const opacity = getRangeOpacity(uncertainty);
                      return {
                        type: 'rect',
                        shape: {
                          x: center[0] - halfWidth,
                          y: top,
                          width: halfWidth * 2,
                          height
                        },
                        style: {
                          fill: `rgba(${predictionRangeTone}, ${opacity})`,
                          stroke: `rgba(${predictionRangeTone}, ${Math.min(opacity + 0.18, 0.9)})`,
                          lineWidth: 1
                        }
                      };
                    }
                  }
                ]
              : []),
            ...(predictionBands.value.length > 0
              ? [
                  {
                    name: '预测上沿',
                    type: 'line',
                    z: 5,
                    data: predictionUpperLineData,
                    showSymbol: false,
                    connectNulls: false,
                    lineStyle: {
                      color: `rgba(${predictionRangeTone}, 0.52)`,
                      width: 1.2
                    }
                  },
                  {
                    name: '预测下沿',
                    type: 'line',
                    z: 5,
                    data: predictionLowerLineData,
                    showSymbol: false,
                    connectNulls: false,
                    lineStyle: {
                      color: `rgba(${predictionRangeTone}, 0.52)`,
                      width: 1.2
                    }
                  },
                  {
                    name: '预测收盘均线',
                    type: 'line',
                    z: 7,
                    data: predictionMeanData,
                    showSymbol: true,
                    symbol: 'circle',
                    symbolSize: 7,
                    connectNulls: false,
                    lineStyle: {
                      color: '#1d4ed8',
                      width: 2.8,
                      type: 'solid'
                    },
                    itemStyle: {
                      color: '#ffffff',
                      borderColor: '#1d4ed8',
                      borderWidth: 2
                    }
                  }
                ]
              : [])
          ]
        },
        true
      );
    };

    const fetchKlineData = async () => {
      if (!props.stockCode || !chartInstance.value) return;
      const requestId = ++latestRequestId.value;
      chartInstance.value.showLoading({ text: '加载K线数据...' });
      try {
        const result = await store.dispatch('fetchStockKline', {
          symbol: props.stockCode,
          klt: selectedKlt.value,
          fqt: 1,
          limit: 100
        });
        if (requestId !== latestRequestId.value) return;

        const normalized = (result?.items || [])
          .map(item => {
            const open = toNumber(item['开盘价']);
            const close = toNumber(item['收盘价']);
            const low = toNumber(item['最低价']);
            const high = toNumber(item['最高价']);
            const time = normalizeTime(item['时间']);
            if (!time) return null;
            return {
              time,
              open,
              close,
              low,
              high,
              volume: toNumber(item['成交量']),
              changePercent: toNumber(item['涨跌幅']),
              turnoverRate: toNumber(item['换手率'])
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.time.localeCompare(b.time));

        klineItems.value = normalized;
        const initialWindowSize = 60;
        if (normalized.length > initialWindowSize) {
          const start = Math.round((1 - initialWindowSize / normalized.length) * 100);
          zoomRange.value = [start, 100];
        } else {
          zoomRange.value = [0, 100];
        }
        renderChart();
      } catch (error) {
        console.error('获取K线失败:', error);
        if (requestId !== latestRequestId.value) return;
        klineItems.value = [];
        renderEmpty('K线加载失败');
      } finally {
        if (requestId === latestRequestId.value && chartInstance.value) {
          chartInstance.value.hideLoading();
        }
      }
    };

    const initChart = () => {
      if (!chartContainer.value) return;
      if (chartInstance.value) {
        chartInstance.value.dispose();
      }
      chartInstance.value = echarts.init(chartContainer.value, null, {
        renderer: 'canvas'
      });
      renderEmpty('加载中...');
    };

    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (chartInstance.value) {
          chartInstance.value.resize();
        }
      }, 120);
    };

    const handlePeriodChange = (klt) => {
      if (selectedKlt.value === klt) return;
      selectedKlt.value = klt;
    };

    watch(selectedKlt, () => {
      fetchKlineData();
    });

    watch(zoomRange, () => {
      renderChart();
    }, { deep: true });

    watch(() => props.stockCode, (newCode, oldCode) => {
      if (newCode && newCode !== oldCode) {
        klineItems.value = [];
        fetchKlineData();
      }
    });

    watch(predictionTsCode, (nextTsCode, prevTsCode) => {
      if (nextTsCode && nextTsCode !== prevTsCode) {
        fetchPricePrediction();
      }
    });

    onMounted(() => {
      initChart();
      fetchKlineData();
      fetchPricePrediction();
      window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      clearPredictionPollTimer();
      if (chartInstance.value) {
        chartInstance.value.dispose();
        chartInstance.value = null;
      }
    });

    return {
      chartContainer,
      selectedKlt,
      klineItems,
      zoomRange,
      periodOptions,
      handlePeriodChange,
      predictionSignal,
      predictionSignalText,
      predictionProbabilityPercentText,
      predictionProbabilityStyle,
      predictionError,
      predictionStatusText,
      showPredictionPlaceholder
    };
  }
};
</script>

<style lang="scss" scoped>
.stock-chart-section {
  background: #fff;
  border: 1px solid #edf1f5;
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 20px;

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .chart-header-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .section-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    line-height: 1.3;
    white-space: nowrap;
  }

  .adjustment-tag {
    color: #9ca3af;
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
  }

  .signal-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 34px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid #dbeafe;
    background: linear-gradient(90deg, #eff6ff, #f8fafc);
  }

  .signal-text {
    color: #334155;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    white-space: nowrap;
  }

  .signal-value {
    margin-left: 4px;
    font-size: 15px;
    font-weight: 700;

    &.is-bullish {
      color: #dc2626;
    }

    &.is-bearish {
      color: #16a34a;
    }

    &.is-neutral {
      color: #475569;
    }
  }

  .signal-progress {
    position: relative;
    flex: 1;
    min-width: 140px;
    max-width: 320px;
    height: 12px;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    background: #e2e8f0;
    overflow: hidden;
  }

  .signal-progress-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 0.25s ease;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.36) inset;
  }

  .signal-probability {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    min-width: 58px;
    text-align: right;
  }

  .prediction-status {
    margin: 0;
    color: #3b82f6;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
  }

  .prediction-error {
    margin: 0;
    color: #dc2626;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    padding: 4px 0 0;
  }

  .period-switch {
    margin-left: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    max-width: 460px;
    min-width: 0;
  }

  .period-button {
    border: 1px solid #d8dee8;
    background: #fff;
    color: #4b5563;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.4;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #9ea8b6;
      color: #1f2937;
    }

    &.is-active {
      color: #1e40af;
      border-color: #9ab0f5;
      background: #f4f8ff;
      font-weight: 600;
    }
  }

  .stock-chart-wrap {
    position: relative;
  }

  .stock-chart {
    width: 100%;
    height: 420px;
  }

  .prediction-loading-mask {
    position: absolute;
    top: 48px;
    right: 20px;
    width: min(20%, 156px);
    min-width: 110px;
    height: calc(100% - 96px);
    border: 1px dashed rgba(59, 130, 246, 0.6);
    border-radius: 12px;
    background: radial-gradient(circle at 30% 20%, rgba(191, 219, 254, 0.68), rgba(226, 232, 240, 0.8));
    backdrop-filter: blur(4px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
    padding: 10px;

    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -120%;
      width: 160%;
      height: 220%;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
      filter: blur(8px);
      animation: predictionMaskSweep 2s linear infinite;
    }

    .loading-title,
    .loading-desc {
      position: relative;
      z-index: 1;
    }

    .loading-title {
      font-size: 12px;
      font-weight: 700;
      color: #1e3a8a;
    }

    .loading-desc {
      font-size: 11px;
      line-height: 1.5;
      color: #334155;
    }
  }

  .chart-range-slider {
    margin-top: 10px;
    padding: 0 4px;
  }
}

@keyframes predictionMaskSweep {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(180%);
  }
}

@media (max-width: 768px) {
  .stock-chart-section {
    padding: 14px 14px 12px;

    .signal-row {
      flex-wrap: wrap;
      gap: 8px;
    }

    .signal-text {
      width: 100%;
      white-space: normal;
    }

    .signal-progress {
      max-width: none;
    }

    .stock-chart {
      height: 360px;
    }

    .prediction-loading-mask {
      width: min(28%, 130px);
      top: 40px;
      right: 10px;
      height: calc(100% - 84px);
    }
  }
}

@media (max-width: 576px) {
  .stock-chart-section {
    .chart-header {
      flex-direction: column;
      align-items: stretch;
    }

    .title-group {
      justify-content: space-between;
    }

    .period-switch {
      width: 100%;
      max-width: none;
      justify-content: flex-start;
    }

    .period-button {
      flex: 1 1 calc(33.333% - 6px);
      padding: 6px 0;
      text-align: center;
    }

    .stock-chart {
      height: 320px;
    }

    .prediction-loading-mask {
      top: 36px;
      right: 8px;
      width: min(35%, 118px);
      min-width: 100px;
      height: calc(100% - 78px);
      padding: 8px;
    }
  }
}
</style>
