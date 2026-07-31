<template>
  <main class="trend-report-page">
    <section class="report-shell">
      <header class="report-header">
        <div>
          <p class="eyebrow">AI 研判</p>
          <h1>趋势股评分分析报告</h1>
          <p class="report-date">{{ displayDate }} · AI 生成内容，仅供参考</p>
        </div>
        <RouterLink class="back-link" to="/trend">返回趋势评分</RouterLink>
      </header>

      <div v-if="loading" class="state-card">报告加载中…</div>
      <div v-else-if="errorMessage" class="state-card error-state">{{ errorMessage }}</div>
      <div v-else-if="!report" class="state-card">当前暂无趋势股评分报告，请在报告生成后刷新此页面。</div>

      <template v-else>
        <section class="conclusion-card">
          <p>今日结论</p>
          <h2>{{ report.summary || '暂无明确结论，请结合下方内容判断。' }}</h2>
        </section>
        <section v-if="dimensions.length" class="section-card">
          <h2>维度解读</h2>
          <ul><li v-for="item in dimensions" :key="item">{{ item }}</li></ul>
        </section>
        <section v-if="trendJudgment" class="section-card">
          <h2>趋势判断</h2><p>{{ trendJudgment }}</p>
        </section>
        <section v-if="trackAnalysis.length" class="section-card">
          <h2>赛道分析</h2>
          <ul><li v-for="item in trackAnalysis" :key="item">{{ item }}</li></ul>
        </section>
        <section v-if="report.risks.length" class="section-card risk-card">
          <h2>风险提示</h2>
          <ul><li v-for="risk in report.risks" :key="risk">{{ risk }}</li></ul>
        </section>
        <section v-if="attentionAdvice" class="section-card">
          <h2>关注建议</h2><p>{{ attentionAdvice }}</p>
        </section>
        <section v-if="report.details && !hasStructuredSections" class="section-card">
          <h2>完整分析</h2><pre>{{ report.details }}</pre>
        </section>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { agentReportApi } from '@/shared/api/api';
import {
  extractReportSection,
  normalizeTrendScoreReport,
  shanghaiDateString,
  toBulletItems,
} from '../utils/trendReport.mjs';

const route = useRoute();
const loading = ref(true);
const errorMessage = ref('');
const report = ref(null);
const requestedDate = typeof route.query.date === 'string' ? route.query.date : shanghaiDateString();

const dimensions = computed(() => toBulletItems(extractReportSection(report.value?.details, '维度解读')));
const trendJudgment = computed(() => toBulletItems(extractReportSection(report.value?.details, '趋势判断')).join(' '));
const trackAnalysis = computed(() => toBulletItems(extractReportSection(report.value?.details, '赛道分析')));
const attentionAdvice = computed(() => toBulletItems(extractReportSection(report.value?.details, '关注建议')).join(' '));
const hasStructuredSections = computed(() => (
  dimensions.value.length || trendJudgment.value || trackAnalysis.value.length || attentionAdvice.value || report.value?.risks.length
));
const displayDate = computed(() => report.value?.reportDate || requestedDate);

onMounted(async () => {
  try {
    report.value = normalizeTrendScoreReport(await agentReportApi.getReport('trend_score', requestedDate));
  } catch (error) {
    console.error('[TrendScoreReport] 加载报告失败:', error);
    errorMessage.value = '报告暂时无法加载，请稍后重试。';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.trend-report-page { min-height: 100vh; padding: 32px 20px 56px; background: #f5f7fb; }
.report-shell { max-width: 920px; margin: 0 auto; }
.report-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.eyebrow { margin: 0 0 8px; color: #0b5fff; font-size: 13px; font-weight: 700; letter-spacing: .08em; }
h1, h2, p { margin-top: 0; } h1 { margin-bottom: 8px; color: #0a1733; font-size: 28px; } h2 { margin-bottom: 14px; color: #0a1733; font-size: 18px; }
.report-date { margin-bottom: 0; color: #8a96b0; font-size: 13px; }.back-link { color: #0b5fff; font-size: 14px; text-decoration: none; white-space: nowrap; }
.state-card, .section-card, .conclusion-card { margin-bottom: 16px; padding: 24px; border: 1px solid #e1e9f5; border-radius: 14px; background: #fff; color: #41516f; line-height: 1.75; }
.error-state { color: #d83a52; }.conclusion-card { border-color: #cfe0ff; background: linear-gradient(135deg, #eff6ff, #fff); }.conclusion-card p { margin-bottom: 8px; color: #0b5fff; font-size: 13px; font-weight: 700; }.conclusion-card h2 { margin-bottom: 0; font-size: 21px; }
ul { margin: 0; padding-left: 20px; } li + li { margin-top: 8px; } .risk-card { border-color: #ffd6dc; background: #fff8f9; } pre { margin: 0; white-space: pre-wrap; font: inherit; }
@media (max-width: 760px) { .trend-report-page { padding: 20px 14px 40px; }.report-header { flex-direction: column; gap: 12px; } h1 { font-size: 24px; }.state-card, .section-card, .conclusion-card { padding: 18px; } }
</style>
