<template>
  <div class="card stock-chart-card">
    <div class="card-header">
      <div class="title-group">
        <h3>技术面</h3>
        <span class="adjustment-tag">前复权历史K线</span>
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
    <div class="card-body">
      <div class="stock-chart-wrap">
        <div class="stock-chart" ref="chartContainer"></div>
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
  </div>
</template>

<script>
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import { useStore } from 'vuex';
import { stockApi } from '@/services/api';
import * as echarts from 'echarts/core';
import { CandlestickChart, LineChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  MarkLineComponent,
  AxisPointerComponent,
  GraphicComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  CandlestickChart,
  LineChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  MarkLineComponent,
  AxisPointerComponent,
  GraphicComponent,
  CanvasRenderer
]);

// 预测面板开关：Kronos 预测已下线，预留位置给后续新预测模型
const SHOW_PREDICTION = false;

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
const PREDICTION_MEAN_COLOR = '#1d4ed8';
const PREDICTION_UPPER_COLOR = '#ef4444';
const PREDICTION_LOWER_COLOR = '#14b8a6';
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

    const resolvePredictionSymbol = (rawCode) => {
      const source = String(rawCode || '').trim().toUpperCase();
      if (!source) return '';
      if (/^\d{6}\.(SH|SZ|BJ)$/.test(source)) {
        return source;
      }
      if (/^\d{6}$/.test(source)) return source;
      const digitsMatch = source.match(/\d{6}/);
      return digitsMatch ? digitsMatch[0] : '';
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

    const getPredictionDotSize = (uncertainty) => {
      const parsed = toFiniteNumber(uncertainty);
      const confidence = parsed === null
        ? 0.5
        : Math.max(0, Math.min(1, 1 - parsed));
      return 4 + confidence * 10;
    };

    const predictionSymbol = computed(() => resolvePredictionSymbol(props.stockCode));

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

    const predictionTimeText = computed(() => {
      const baseDate = String(predictionResult.value?.baseDate || '').trim();
      if (baseDate) return `基准日 ${baseDate}`;
      return '基准日 --';
    });

    const predictionLookbackDays = computed(() => {
      const value = Number(predictionResult.value?.lookback);
      if (Number.isFinite(value) && value > 0) return Math.round(value);
      return PREDICTION_DEFAULTS.lookback;
    });

    const predictionPredLenDays = computed(() => {
      const value = Number(predictionResult.value?.predLen);
      if (Number.isFinite(value) && value > 0) return Math.round(value);
      return PREDICTION_DEFAULTS.predLen;
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
          graphic: [{
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: message,
              fill: '#9ca3af',
              fontSize: 14
            }
          }]
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
        || !!payload.symbol;
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

      const directionProbability = normalizeProbability(rawDirection.probability);

      return {
        symbol: String(source.symbol || ''),
        baseDate: String(source.base_date || source.baseDate || ''),
        lookback: Number(source.lookback || source.input_days || source.inputDays || PREDICTION_DEFAULTS.lookback),
        predLen: Number(source.pred_len || source.predLen || bands.length || 0),
        cached: !!source.cached,
        cacheExpiresAt: String(source.cache_expires_at || source.cacheExpiresAt || ''),
        direction: {
          signal: String(rawDirection.signal || '').toLowerCase(),
          probability: directionProbability
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

    const normalizePredictionErrorMessage = (rawError) => {
      const message = String(rawError || '').trim();
      if (!message) return '预测服务暂时不可用，请稍后重试';
      if (/RemoteDisconnected|Connection aborted|ECONNRESET|socket hang up|network error|timed out|timeout/i.test(message)) {
        return '预测服务连接中断，请稍后重试';
      }
      return message;
    };

    const finishPredictionWithError = (message) => {
      clearPredictionPollTimer();
      predictionLoading.value = false;
      predictionTaskId.value = '';
      predictionError.value = normalizePredictionErrorMessage(message || '价格预测失败');
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
          finishPredictionWithError(normalizePredictionErrorMessage(parsed.error || '预测任务失败'));
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

    const parseCacheDateTime = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return 0;

      let timestamp = Date.parse(raw);
      if (Number.isFinite(timestamp)) return timestamp;

      const utcOffsetMatch = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+UTC([+-]\d{2}:\d{2})$/i);
      if (utcOffsetMatch) {
        const isoText = `${utcOffsetMatch[1]}T${utcOffsetMatch[2]}${utcOffsetMatch[3]}`;
        timestamp = Date.parse(isoText);
        if (Number.isFinite(timestamp)) return timestamp;
      }

      const gmtText = raw.replace(/\bUTC\b/i, 'GMT');
      timestamp = Date.parse(gmtText);
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    const getLatestMatchingCacheEntry = (cacheResponse, requestPayload) => {
      const entries = Array.isArray(cacheResponse?.entries) ? cacheResponse.entries : [];
      const matchingEntries = entries.filter((entry) => {
        const symbol = String(entry?.symbol || '').trim().toUpperCase();
        if (symbol !== requestPayload.symbol.toUpperCase()) return false;

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

      if (!matchingEntries.length) return null;

      const ranked = matchingEntries
        .map((entry, index) => ({
          entry,
          index,
          timestamp: parseCacheDateTime(entry?.cached_at ?? entry?.cachedAt)
        }))
        .sort((a, b) => {
          if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
          return b.index - a.index;
        });

      return ranked[0]?.entry || null;
    };

    const fetchPricePrediction = async () => {
      const symbol = predictionSymbol.value;
      if (!symbol) {
        predictionLoading.value = false;
        predictionResult.value = null;
        predictionTaskId.value = '';
        predictionStatusText.value = '';
        predictionError.value = '当前股票代码无法映射为预测接口 symbol';
        renderChart();
        return;
      }

      const requestPayload = {
        symbol,
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
        const cacheResponse = await stockApi.getPricePredictionCache(symbol);
        if (requestId !== latestPredictionRequestId.value) return;
        const latestCacheEntry = getLatestMatchingCacheEntry(cacheResponse, requestPayload);
        cacheHit = !!latestCacheEntry;
        if (latestCacheEntry?.result && typeof latestCacheEntry.result === 'object') {
          try {
            applyPredictionResult({
              ...latestCacheEntry.result,
              lookback: latestCacheEntry.lookback,
              pred_len: latestCacheEntry.pred_len ?? latestCacheEntry.result?.pred_len,
              sample_count: latestCacheEntry.sample_count
            });
            predictionStatusText.value = '已读取最新缓存预测结果';
            return;
          } catch (cacheError) {
            console.warn('缓存结果不可用，转为提交预测任务:', cacheError);
            predictionStatusText.value = '缓存结果不可用，正在提交预测任务...';
          }
        } else {
          predictionStatusText.value = cacheHit
            ? '命中缓存，正在提交任务拉取详情...'
            : '缓存未命中，正在提交预测任务...';
        }
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

        finishPredictionWithError(normalizePredictionErrorMessage(parsed.error || '预测服务返回异常'));
      } catch (error) {
        if (requestId !== latestPredictionRequestId.value) return;
        console.warn('预测服务暂不可用:', error?.message || '未知错误');
        const rawMessage = error?.response?.data?.message || error?.message || '预测服务暂不可用';
        finishPredictionWithError(normalizePredictionErrorMessage(rawMessage));
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

      const shouldShowFutureLoadingSlots = SHOW_PREDICTION && predictionLoading.value && predictionBands.value.length === 0;
      const loadingFutureSlots = shouldShowFutureLoadingSlots
        ? Array.from({ length: PREDICTION_DEFAULTS.predLen }, (_, index) => `预测中${index + 1}`)
        : [];
      const predictedCategories = SHOW_PREDICTION
        ? (predictionBands.value.length > 0
            ? predictionBands.value.map((band, index) => band.date || `T+${band.step || index + 1}`)
            : loadingFutureSlots)
        : [];
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
      let highestValue = Number.isFinite(visibleItems[0]?.high) ? visibleItems[0].high : 0;
      let lowestValue = Number.isFinite(visibleItems[0]?.low) ? visibleItems[0].low : 0;
      for (let i = 1; i < visibleItems.length; i += 1) {
        const itemHigh = visibleItems[i]?.high;
        const itemLow = visibleItems[i]?.low;
        if (Number.isFinite(itemHigh) && itemHigh > highestValue) {
          highestValue = itemHigh;
          highestIndex = i;
        }
        if (Number.isFinite(itemLow) && itemLow < lowestValue) {
          lowestValue = itemLow;
          lowestIndex = i;
        }
      }
      const hasValidMarkPointData = Number.isFinite(highestValue) && Number.isFinite(lowestValue)
        && realCategories[highestIndex] !== undefined
        && realCategories[lowestIndex] !== undefined;

      const predictionMeanData = [...new Array(realCategories.length).fill(null)];
      const predictionUpperLineData = [...new Array(realCategories.length).fill(null)];
      const predictionLowerLineData = [...new Array(realCategories.length).fill(null)];
      const predictionBandBaseData = [...new Array(realCategories.length).fill(null)];
      const predictionBandSpreadData = [...new Array(realCategories.length).fill(null)];
      if (predictionBands.value.length > 0) {
        predictionMeanData.push(
          ...predictionBands.value.map((band) => ({
            value: band.meanClose,
            uncertainty: band.uncertainty
          }))
        );
        predictionUpperLineData.push(...predictionBands.value.map((band) => band.tradingHigh));
        predictionLowerLineData.push(...predictionBands.value.map((band) => band.tradingLow));
        predictionBandBaseData.push(...predictionBands.value.map((band) => band.tradingLow));
        predictionBandSpreadData.push(
          ...predictionBands.value.map((band) => Math.max(0, band.tradingHigh - band.tradingLow))
        );
      } else if (loadingFutureSlots.length > 0) {
        predictionMeanData.push(...new Array(loadingFutureSlots.length).fill(null));
        predictionUpperLineData.push(...new Array(loadingFutureSlots.length).fill(null));
        predictionLowerLineData.push(...new Array(loadingFutureSlots.length).fill(null));
        predictionBandBaseData.push(...new Array(loadingFutureSlots.length).fill(null));
        predictionBandSpreadData.push(...new Array(loadingFutureSlots.length).fill(null));
      }

      const hasPredictionBands = predictionBands.value.length > 0;
      const hasPredictionArea = predictedCategories.length > 0 && realCategories.length > 0;
      const formatPredictionBandTooltip = (band) => {
        if (!band) return '';
        const confidence = getConfidenceRatio(band.uncertainty);
        return [
          `<div style="margin-bottom:6px;font-weight:600;">${band.date || `T+${band.step}`}</div>`,
          `<div>预测最低价：<span style="color:${PREDICTION_LOWER_COLOR};font-weight:600;">${formatPrice(band.tradingLow)}</span></div>`,
          `<div>预测最高价：<span style="color:${PREDICTION_UPPER_COLOR};font-weight:600;">${formatPrice(band.tradingHigh)}</span></div>`,
          `<div>预测收盘价：<span style="color:${PREDICTION_MEAN_COLOR};font-weight:700;">${formatPrice(band.meanClose)}</span></div>`,
          `<div>置信度：<span style="font-weight:600;">${formatRatioPercent(confidence, 1)}</span></div>`
        ].join('');
      };

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

              const axisIndex = Number.isInteger(rows[0]?.dataIndex) ? rows[0].dataIndex : -1;
              const fallbackBand = axisIndex >= realCategories.length
                ? predictionBands.value[axisIndex - realCategories.length]
                : null;
              const band = fallbackBand;
              if (band) {
                return formatPredictionBandTooltip(band);
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
          legend: {
            show: hasPredictionBands,
            top: 0,
            left: 'center',
            itemWidth: 14,
            itemHeight: 8,
            textStyle: {
              color: '#64748b',
              fontSize: 12
            },
            data: ['K线', '预测区间', '预测最高价', '预测最低价', '预测收盘价']
          },
          grid: {
            left: '6%',
            right: hasPredictionArea ? '7%' : '4%',
            top: hasPredictionBands ? 56 : 26,
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
              markPoint: hasValidMarkPointData ? {
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
              } : undefined
            },
            ...(predictionBands.value.length > 0
              ? [
                  {
                    name: '__预测区间基线',
                    type: 'line',
                    z: 3,
                    stack: 'prediction-band',
                    data: predictionBandBaseData,
                    symbol: 'none',
                    showSymbol: false,
                    connectNulls: false,
                    lineStyle: {
                      opacity: 0
                    },
                    areaStyle: {
                      opacity: 0
                    },
                    emphasis: {
                      disabled: true
                    },
                    tooltip: {
                      show: false
                    }
                  },
                  {
                    name: '预测区间',
                    type: 'line',
                    z: 4,
                    stack: 'prediction-band',
                    data: predictionBandSpreadData,
                    symbol: 'none',
                    showSymbol: false,
                    connectNulls: false,
                    lineStyle: {
                      opacity: 0
                    },
                    areaStyle: {
                      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(239, 68, 68, 0.20)' },
                        { offset: 1, color: 'rgba(20, 184, 166, 0.20)' }
                      ])
                    },
                    tooltip: {
                      show: false
                    }
                  },
                  {
                    name: '预测最高价',
                    type: 'line',
                    z: 6,
                    data: predictionUpperLineData,
                    showSymbol: false,
                    connectNulls: false,
                    lineStyle: {
                      color: PREDICTION_UPPER_COLOR,
                      width: 1.8,
                      type: 'dashed'
                    }
                  },
                  {
                    name: '预测最低价',
                    type: 'line',
                    z: 6,
                    data: predictionLowerLineData,
                    showSymbol: false,
                    connectNulls: false,
                    lineStyle: {
                      color: PREDICTION_LOWER_COLOR,
                      width: 1.8,
                      type: 'dashed'
                    }
                  },
                  {
                    name: '预测收盘价',
                    type: 'line',
                    z: 7,
                    data: predictionMeanData,
                    showSymbol: true,
                    symbol: 'circle',
                    symbolSize: (_value, params) => {
                      const point = params?.data;
                      const uncertainty = point && typeof point === 'object'
                        ? point.uncertainty
                        : null;
                      return getPredictionDotSize(uncertainty);
                    },
                    connectNulls: false,
                    lineStyle: {
                      color: PREDICTION_MEAN_COLOR,
                      width: 2.6,
                      type: 'solid'
                    },
                    itemStyle: {
                      color: '#ffffff',
                      borderColor: PREDICTION_MEAN_COLOR,
                      borderWidth: 2
                    },
                    tooltip: {
                      trigger: 'item',
                      formatter: (params) => {
                        const pointIndex = Number(params?.dataIndex);
                        if (!Number.isInteger(pointIndex)) return '';
                        const bandIndex = pointIndex - realCategories.length;
                        if (bandIndex < 0) return '';
                        const band = predictionBands.value[bandIndex];
                        return formatPredictionBandTooltip(band);
                      }
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

    watch(predictionSymbol, (nextSymbol, prevSymbol) => {
      if (nextSymbol && nextSymbol !== prevSymbol) {
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
      showPredictionPanel: SHOW_PREDICTION,
      predictionSignal,
      predictionSignalText,
      predictionProbabilityPercentText,
      predictionProbabilityStyle,
      predictionTimeText,
      predictionLookbackDays,
      predictionPredLenDays,
      predictionError,
      predictionStatusText,
      showPredictionPlaceholder
    };
  }
};
</script>

<style lang="scss" scoped>
.stock-chart-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid #f0f0f0;

    h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e293b;
    }

    .title-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .adjustment-tag {
      color: #9ca3af;
      font-size: 12px;
      line-height: 1;
      white-space: nowrap;
    }
  }

  .card-body {
    padding: 16px 20px;
    position: relative;
  }

  .signal-row {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 12px;
    min-height: 0;
    padding: 20px 0;
    border: 0;
    background: transparent;
  }

  .signal-decision {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .signal-value {
    margin: 0;
    font-size: 2rem;
    line-height: 1;
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

  .signal-help {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid #94a3b8;
    background: #ffffff;
    color: #475569;
    font-size: 12px;
    line-height: 1;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }

  .signal-help:hover {
    border-color: #64748b;
    color: #334155;
  }

  :deep(.prediction-help-popover) {
    border-radius: 12px;
    border: 1px solid #dbe4ee;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
    padding: 0;
  }

  :deep(.prediction-help-popover .el-popover__title) {
    margin-bottom: 0;
  }

  :deep(.prediction-help-content) {
    padding: 12px 14px;
    font-size: 12px;
    color: #334155;
    line-height: 1.6;
  }

  :deep(.prediction-help-content .help-title-row) {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  :deep(.prediction-help-content .help-chip) {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 7px;
    border-radius: 999px;
    background: #e0e7ff;
    color: #3730a3;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  :deep(.prediction-help-content .help-title) {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }

  :deep(.prediction-help-content .help-meta) {
    margin: 0 0 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #334155;
  }

  :deep(.prediction-help-content p) {
    margin: 0;
  }

  :deep(.prediction-help-content p + p) {
    margin-top: 8px;
  }

  :deep(.prediction-help-content a) {
    color: #1d4ed8;
    text-decoration: none;
  }

  :deep(.prediction-help-content a:hover) {
    text-decoration: underline;
  }

  :deep(.prediction-help-content .risk-tip) {
    margin-top: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #7f1d1d;
  }

  .signal-progress {
    position: relative;
    width: 100%;
    min-width: 180px;
    max-width: 360px;
    height: 16px;
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

  .signal-progress-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    justify-self: end;
    min-width: 0;
    justify-content: flex-end;
  }

  .signal-time {
    margin-left: 2px;
    flex-shrink: 0;
    font-size: 12px;
    color: #64748b;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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
  .stock-chart-card {
    .signal-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .signal-decision {
      width: 100%;
    }

    .signal-value {
      margin-bottom: 2px;
    }

    .signal-progress-wrap {
      width: 100%;
      justify-self: auto;
      justify-content: flex-start;
    }

    .signal-progress {
      max-width: none;
      min-width: 0;
      flex: 1;
    }

    .signal-time {
      margin-left: 2px;
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
  .stock-chart-card {
    .card-header {
      flex-wrap: wrap;
      gap: 8px;
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
