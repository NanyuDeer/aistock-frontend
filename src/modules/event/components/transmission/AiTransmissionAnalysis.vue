<template>
  <div class="transmission-analysis" v-if="data">
    <!-- 顶部步骤指示器（镜像 APP Steps：实心蓝圆+白对勾+连接线） -->
    <div class="mini-steps">
      <div v-for="(s, i) in stepItems" :key="i" class="mini-step">
        <div class="mini-head">
          <div class="mini-line" :class="{ 'is-empty': i === 0 }"></div>
          <div class="mini-dot is-done">
            <span class="mini-check" :style="{ backgroundImage: `url(${checkIcon})` }" />
          </div>
          <div class="mini-line" :class="{ 'is-empty': i === stepItems.length - 1 }"></div>
        </div>
        <span class="mini-title">{{ s.title }}</span>
      </div>
    </div>

    <!-- 步骤1: 影响机制 -->
    <div class="inner-step">
      <div class="inner-step-head">
        <span class="inner-step-title">{{ stepItems[0].title }}</span>
      </div>
      <p class="mechanism-text">{{ data.mechanism }}</p>
      <div class="core-industry" v-if="data.coreIndustry">
        <span class="ci-label">核心行业</span>
        <span class="ci-name">{{ data.coreIndustry.name }}</span>
        <span class="ci-impact">{{ data.coreIndustry.impact }}</span>
        <span class="ci-reason">{{ data.coreIndustry.reason }}</span>
      </div>
    </div>

    <!-- 步骤2: 关键变量 -->
    <div class="inner-step">
      <div class="inner-step-head">
        <span class="inner-step-title">{{ stepItems[1].title }}</span>
      </div>
      <div class="variable-list" v-if="data.variables?.length">
        <div v-for="(v, idx) in data.variables" :key="idx" class="var-row" :class="'var-' + v.direction">
          <div class="var-left">
            <span class="var-name">{{ v.name }}</span>
            <span class="var-direction">{{ v.direction === 'bullish' ? '↑ 正向' : v.direction === 'bearish' ? '↓ 负向' : '→ 中性' }}</span>
          </div>
          <div class="var-strength">
            <span class="rate-stars">
              <span
                v-for="s in 5"
                :key="s"
                class="rate-star"
                :class="{ 'is-active': s <= rateOf(v) }"
                :style="{ backgroundImage: `url(${s <= rateOf(v) ? goldStar : grayStar})` }"
              />
            </span>
          </div>
          <span class="var-reason">{{ v.explanation }}</span>
        </div>
      </div>
    </div>

    <!-- 步骤3: 产业链传导 -->
    <div class="inner-step">
      <div class="inner-step-head">
        <span class="inner-step-title">{{ stepItems[2].title }}</span>
      </div>
      <div class="chain-view" v-if="data.chain?.length">
        <div v-for="(c, ci) in data.chain" :key="ci" class="chain-node">
          <div class="chain-dot-col">
            <div class="chain-dot" :class="'dot-' + c.direction" />
            <div class="chain-line" v-if="ci < data.chain.length - 1" />
          </div>
          <div class="chain-info">
            <div class="chain-top">
              <span class="chain-industry">{{ c.industry }}</span>
              <span class="chain-level">L{{ c.level }} {{ c.relation }}</span>
            </div>
            <span class="chain-reason">{{ c.reason }}</span>
            <div class="chain-bar-wrap">
              <div class="chain-bar">
                <div
                  class="chain-bar-fill"
                  :class="'fill-' + c.direction"
                  :style="{ width: Math.round(c.impactStrength * 100) + '%' }"
                />
              </div>
              <span class="chain-pct">{{ Math.round(c.impactStrength * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>
      <!-- chain 为空降级文案（不暴露系统内部异常） -->
      <div v-else class="chain-empty">暂无明确行业影响</div>
    </div>

    <!-- 步骤4: 产业链关系图谱 -->
    <div class="inner-step">
      <div class="inner-step-head">
        <span class="inner-step-title">{{ stepItems[3].title }}</span>
      </div>
      <EventTransmissionGraph :data="data" :event-title="eventTitle" />
    </div>
  </div>
</template>

<script>
/**
 * AiTransmissionAnalysis — Web 端 AI 影响传导推理主容器
 *
 * 镜像 APP 端同名组件（AiTransmissionAnalysis.vue）：
 * 顶部 4 子步指示器 + 4 内部区块（影响机制 / 关键变量 / 产业链传导 / 关系图谱）。
 *
 * 图标对齐 APP 共享组件：
 * - 4 子步 → 自定义 Steps（实心蓝圆 + 白色 SVG 对勾 + 连接线），非 el-steps
 * - 关键变量星级 → 自定义金色 SVG 星（活跃 #d4a843 实心 / 未点亮 #b8c3d6 描边），非 el-rate
 * - 传导强度 → 自定义横向进度条，轨道/填充对齐 APP Progress（轨道 $line-soft、填充 status 渐变）
 *
 * 注意：APP 用 rpx，Web 用 px，迁移时 APP 的 rpx 值一律 ÷2（4rpx→2px、2rpx→1px、12rpx→6px…）。
 * 曾出现的偏差：连接线粗细按 rpx 数值直接写成 px（偏粗一倍）、圆点偏大、强度条底色偏深、填充用纯色。
 *
 * Props:
 * - data: transmissionAnalysis（含 mechanism/coreIndustry/variables[]/chain[]）
 * - eventTitle: 事件标题（供关系图谱事件节点展示）
 */
import EventTransmissionGraph from './EventTransmissionGraph.vue'

/** 星形 SVG path（24x24 viewBox，与 APP Rate 同源） */
const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

/** 构建星形 SVG data URI（filled=true 为填充版 active，false 为描边版 inactive，对齐 APP Rate） */
function buildStarUri(color, filled) {
  const fillAttrs = filled
    ? `fill="${color}" stroke="${color}" stroke-width="1"`
    : `fill="none" stroke="${color}" stroke-width="1.5"`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${fillAttrs} stroke-linejoin="round" width="24" height="24"><path d="${STAR_PATH}"/></svg>`
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

/** 构建白色对勾 SVG data URI（与 APP Steps 的 checkIcon 完全同源，非字体字符） */
function buildCheckUri() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M20 6L9 17l-5-5"/></svg>'
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export default {
  name: 'AiTransmissionAnalysis',
  components: { EventTransmissionGraph },
  props: {
    data: { type: Object, default: null },
    eventTitle: { type: String, default: '' },
  },
  data() {
    return {
      // 金色实心星 / 浅灰描边星（对齐 APP $gold #d4a843 与 INACTIVE #b8c3d6）
      goldStar: buildStarUri('#d4a843', true),
      grayStar: buildStarUri('#b8c3d6', false),
      // 白色对勾（对齐 APP Steps checkIcon，避免字体字符在不同端形状/字重不一致）
      checkIcon: buildCheckUri(),
    }
  },
  methods: {
    /** v.strength(0~1) → 1~5 星 */
    rateOf(v) {
      return Math.max(1, Math.min(5, Math.round(Number(v.strength) * 5)))
    },
    /** 传导强度条填充色：bullish=红 / bearish=绿 / neutral=灰（A股 红涨绿跌） */
    fillClass(direction) {
      return 'fill-' + (direction === 'bullish' ? 'bullish' : direction === 'bearish' ? 'bearish' : 'neutral')
    },
  },
  computed: {
    stepItems() {
      return [
        { title: '分析事件机制' },
        { title: '识别关键变量' },
        { title: '推演产业链影响' },
        { title: '事件传导产业链关系图谱' },
      ]
    },
  },
}
</script>

<style lang="scss" scoped>
.transmission-analysis {
  display: flex;
  flex-direction: column;
}

/* ===== 顶部步骤指示器（镜像 APP Steps：实心蓝圆+白对勾+连接线） =====
 * 尺寸对齐 APP Steps：连接线 4rpx→2px、圆点 56rpx→28px、对勾图标 32rpx→16px
 * 注意：Web 无 rpx，APP 的 rpx 值需按 ÷2 换算为 px */
.mini-steps {
  display: flex;
  padding: 8px 0 16px;
  border-bottom: 1px solid var(--ev-border-light);
  margin-bottom: 8px;
}

.mini-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mini-head {
  display: flex;
  align-items: center;
  width: 100%;
}

.mini-line {
  flex: 1;
  height: 2px; /* APP 4rpx */
  background: var(--ev-primary);
}

.mini-line.is-empty { background: transparent; }

.mini-dot {
  width: 28px; /* APP 56rpx */
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.mini-dot.is-done {
  background: var(--ev-primary);
}

/* 白色对勾图标（SVG，同 APP checkIcon） */
.mini-check {
  width: 16px; /* APP 32rpx */
  height: 16px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.mini-title {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ev-text-primary);
  text-align: center;
}

/* ===== 内部步骤 ===== */
.inner-step {
  padding: 14px 0;
  border-bottom: 1px solid var(--ev-border-light);
}
.inner-step:last-child { border-bottom: none; }

.inner-step-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.inner-step-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ev-text-primary);
}

/* ===== 步骤1: 机制文字 + 核心行业 ===== */
.mechanism-text {
  font-size: 13px;
  color: var(--ev-text-secondary);
  line-height: 1.65;
  margin: 0 0 12px;
}

.core-industry {
  padding: 10px 12px;
  border-radius: 5px;
  background: var(--ev-accent-bg);
  border-left: 2px solid var(--ev-accent);
}

.ci-label { display: block; font-size: 11px; color: var(--ev-accent); font-weight: 600; margin-bottom: 5px; }
.ci-name { display: block; font-size: 13px; color: var(--ev-text-primary); font-weight: 700; margin-bottom: 3px; }
.ci-impact { display: block; font-size: 12px; color: var(--ev-text-secondary); margin-bottom: 3px; }
.ci-reason { display: block; font-size: 11px; color: var(--ev-text-muted); line-height: 1.5; }

/* ===== 步骤2: 变量 ===== */
.variable-list { display: flex; flex-direction: column; gap: 10px; }

.var-row {
  padding: 10px 12px;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.var-bullish { background: var(--ev-negative-bg); border: 1px solid var(--ev-negative-soft); }
.var-bearish { background: var(--ev-positive-bg); border: 1px solid var(--ev-positive-soft); }
.var-neutral { background: var(--ev-border-light); border: 1px solid rgba(148, 163, 184, 0.08); }

.var-left { display: flex; align-items: center; gap: 8px; }
.var-name { font-size: 13px; font-weight: 600; color: var(--ev-text-primary); }
.var-direction { font-size: 11px; font-weight: 500; }
.var-bullish .var-direction { color: var(--ev-negative); }
.var-bearish .var-direction { color: var(--ev-positive); }
.var-neutral .var-direction { color: var(--ev-text-tertiary); }

.var-strength { display: flex; align-items: center; gap: 8px; }

.rate-stars { display: inline-flex; align-items: center; gap: 2px; }
.rate-star {
  width: 16px;
  height: 16px;
  display: inline-flex;
  flex-shrink: 0;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.var-reason { font-size: 11px; color: var(--ev-text-muted); line-height: 1.5; }

/* ===== 步骤3: 传导链（圆点与连接线尺寸对齐 APP：dot 12rpx→6px、line 2rpx→1px） ===== */
.chain-view { display: flex; flex-direction: column; }

.chain-empty {
  font-size: 12px;
  color: var(--ev-text-muted);
  padding: 10px 0;
}

.chain-node { display: flex; gap: 6px; } /* APP 12rpx */

.chain-dot-col {
  display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
  width: 8px; padding-top: 4px; /* APP 16rpx / 8rpx */
}

.chain-dot { width: 6px; height: 6px; border-radius: 50%; } /* APP 12rpx */
.dot-bullish { background: var(--ev-negative); box-shadow: 0 0 3px rgba(244, 63, 94, 0.3); }
.dot-bearish { background: var(--ev-positive); box-shadow: 0 0 3px rgba(34, 197, 94, 0.3); }
.dot-neutral { background: var(--ev-text-muted); }

.chain-line { width: 1px; flex: 1; background: var(--ev-border); margin: 2px 0; }

.chain-info { flex: 1; padding-bottom: 10px; }
.chain-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.chain-industry { font-size: 13px; font-weight: 600; color: var(--ev-text-primary); }
.chain-level { font-size: 10px; padding: 1px 8px; border-radius: var(--ev-r-full); background: var(--ev-border-light); color: var(--ev-text-muted); }
.chain-reason { font-size: 11px; color: var(--ev-text-muted); line-height: 1.45; display: block; margin-bottom: 6px; }

.chain-bar-wrap { display: flex; align-items: center; gap: 8px; }
/* 强度条对齐 APP Progress：轨道 12rpx→6px + $line-soft 底色；填充为 status 渐变（原为纯色/灰） */
.chain-bar {
  flex: 1;
  height: 6px;
  border-radius: var(--ev-r-full);
  background: var(--ev-line-soft);
  overflow: hidden;
}
.chain-bar-fill {
  height: 100%;
  border-radius: var(--ev-r-full);
}
.fill-bullish { background: linear-gradient(90deg, #e54d5e, #f06a78); }
.fill-bearish { background: linear-gradient(90deg, #18a058, #36b37e); }
.fill-neutral { background: linear-gradient(90deg, #0b5fff, #4d8bff); }
.chain-pct { font-size: 10px; color: var(--ev-text-muted); flex-shrink: 0; }
</style>