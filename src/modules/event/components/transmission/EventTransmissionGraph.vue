<template>
  <div class="transmission-graph" v-if="data">
    <div class="graph-flow">
      <!-- 事件节点 -->
      <div class="graph-node event-node">
        <span class="node-type-label">事件冲击</span>
        <span class="node-main-text">{{ eventTitle || '事件影响' }}</span>
      </div>

      <div class="graph-arrow">
        <div class="arrow-line-bar" />
        <span class="arrow-head">▼</span>
      </div>

      <!-- 关键变量节点 -->
      <div class="graph-node var-node">
        <span class="node-type-label">关键变量</span>
        <div v-for="(v, vi) in variabless" :key="vi" class="var-item">
          <span class="var-item-name">{{ v.name }}</span>
          <span class="var-item-dir" :class="'dir-' + v.direction">
            {{ v.direction === 'bullish' ? '↑' : v.direction === 'bearish' ? '↓' : '→' }}
          </span>
        </div>
      </div>

      <div class="graph-arrow">
        <div class="arrow-line-bar" />
        <span class="arrow-head">▼</span>
      </div>

      <!-- 核心影响行业节点 -->
      <div class="graph-node core-node" :class="'node-' + coreDirection">
        <span class="node-type-label">核心影响行业</span>
        <template v-if="coreList.length">
          <div v-for="(item, i) in coreList" :key="item.key" class="core-item">
            <div class="industry-name-wrap">
              <span class="node-main-text" :class="dirTextClass(item.direction)">{{ item.name }}</span>
              <span class="direction-arrow" :class="dirTextClass(item.direction)">{{ arrow(item.direction) }}</span>
            </div>
            <span class="node-impact-text" v-if="item.note">{{ item.note }}</span>
            <div class="core-item-sep" v-if="i < coreList.length - 1" />
          </div>
        </template>
        <span v-else class="node-main-text">核心影响行业</span>
      </div>

      <!-- 上下游分叉（存在 L2 上下游时保留完整图谱） -->
      <div class="branch-section" v-if="hasUpDown">
        <div class="branch-trunk">
          <div class="arrow-line-bar" />
        </div>
        <div class="branch-fork-wrapper">
          <div class="branch-fork-inner">
            <div class="fork-h-bar" />
            <div class="branch-fork">
              <div v-if="upChain.length" class="branch-col">
                <div class="branch-line-bar" />
                <span class="arrow-head">▼</span>
                <div v-for="c in upChain" :key="c.industry" class="graph-node chain-node" :class="'node-' + c.direction">
                  <span class="node-type-label">{{ c.relation }}</span>
                  <span class="node-main-text small">{{ c.industry }}</span>
                </div>
              </div>
              <div v-if="downChain.length" class="branch-col">
                <div class="branch-line-bar" />
                <span class="arrow-head">▼</span>
                <div v-for="c in downChain" :key="c.industry" class="graph-node chain-node" :class="'node-' + c.direction">
                  <span class="node-type-label">{{ c.relation }}</span>
                  <span class="node-main-text small">{{ c.industry }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI 推理路径总结 -->
    <div class="graph-summary">
      <span class="summary-text">
        AI推理路径：事件首先冲击{{ data.coreIndustry?.name || '核心行业' }}，通过{{ firstTwoVarNames }}等变量向上下游产业扩散。
      </span>
    </div>
  </div>
</template>

<script>
/**
 * EventTransmissionGraph — Web 端 事件传导产业链关系图谱
 *
 * 镜像 APP 端同名组件（EventTransmissionGraph.vue）的完整节点流程图：
 * 事件冲击 → 关键变量 → 核心影响行业 → 上下游分叉（L2 时），底部 AI 推理路径总结。
 *
 * 数据来源：transmissionAnalysis（与 APP 同源，字段齐全）。
 *
 * Props:
 * - data: transmissionAnalysis（含 coreIndustry/variables[]/chain[]，chain 项含 level/relation/direction/impactStrength/reason）
 * - eventTitle: 事件标题（事件节点展示）
 */
import { computed } from 'vue'

export default {
  name: 'EventTransmissionGraph',
  props: {
    data: { type: Object, default: null },
    eventTitle: { type: String, default: '' },
  },
  setup(props) {
    /** 关键变量列表（透传适配，避免模板重复 data?.variables） */
    const variabless = computed(() => props.data?.variables || [])

    /** 核心行业整体方向：关键变量 利好/利空 计数比较决定 */
    const coreDirection = computed(() => {
      const bullish = (props.data?.variables || []).filter((v) => v.direction === 'bullish').length
      const bearish = (props.data?.variables || []).filter((v) => v.direction === 'bearish').length
      return bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral'
    })

    const upChain = computed(() =>
      (props.data?.chain || []).filter((c) => (c.relation || '').includes('上游'))
    )
    const downChain = computed(() =>
      (props.data?.chain || []).filter((c) => (c.relation || '').includes('下游'))
    )
    const hasUpDown = computed(() => upChain.value.length > 0 || downChain.value.length > 0)

    /** 行业传导方向 → 涨跌箭头（A股：bullish=涨=↑，bearish=跌=↓） */
    function arrow(direction) {
      if (direction === 'bullish') return '↑'
      if (direction === 'bearish') return '↓'
      return '→'
    }

    /** 行业传导方向 → 涨跌配色类名（A股：bullish=涨=红，bearish=跌=绿） */
    function dirTextClass(direction) {
      if (direction === 'bullish') return 'text-bullish'
      if (direction === 'bearish') return 'text-bearish'
      return 'text-neutral'
    }

    /**
     * 核心影响行业合并列表（无上下游 L1-only 场景）：
     * 首个为核心影响行业，其后为其他 L1 核心影响行业并入同一框；
     * 存在上下游（L2）时保持完整图谱，其余 L1 不并入。
     */
    const coreList = computed(() => {
      const list = []
      const primary = props.data?.coreIndustry
      if (primary?.name && primary.name.trim()) {
        list.push({ key: 'primary', name: primary.name.trim(), note: primary.impact || '', direction: coreDirection.value })
      }
      if (!hasUpDown.value) {
        const seen = new Set(list.map((x) => x.name))
        for (const c of (props.data?.chain || [])) {
          const name = (c.industry || '').trim()
          if (c.level !== 1 || !name || seen.has(name)) continue
          seen.add(name)
          list.push({ key: `c-${name}`, name, note: c.reason || '', direction: c.direction })
        }
      }
      return list
    })

    /** AI 推理路径总结中的变量名（取前 2，用「和」连接） */
    const firstTwoVarNames = computed(() => {
      const names = (props.data?.variables || []).slice(0, 2).map((v) => v.name).filter(Boolean)
      return names.join('和')
    })

    return {
      variabless,
      coreDirection,
      upChain,
      downChain,
      hasUpDown,
      coreList,
      firstTwoVarNames,
      arrow,
      dirTextClass,
    }
  },
}
</script>

<style lang="scss" scoped>
.transmission-graph {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.graph-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  background: var(--ev-primary-50); /* 对齐 APP $primary-50 #eaf2ff */
  border-radius: 7px;               /* 对齐 APP 14rpx */
}

/* ===== 节点卡片 ===== */
.graph-node {
  padding: 10px 16px;
  border-radius: 7px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.event-node { background: linear-gradient(135deg, var(--ev-accent-soft), var(--ev-accent-bg)); border: 1px solid rgba(99, 102, 241, 0.18); }
.var-node { background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.15); }

.node-bullish { background: var(--ev-negative-bg); border: 1px solid var(--ev-negative-soft); }
.node-bearish { background: var(--ev-positive-bg); border: 1px solid var(--ev-positive-soft); }
.node-neutral { background: var(--ev-border-light); border: 1px solid rgba(148, 163, 184, 0.1); }

.node-type-label { font-size: 11px; color: var(--ev-text-muted); font-weight: 500; }
.node-main-text { font-size: 13px; font-weight: 700; color: var(--ev-text-primary); text-align: center; }
.node-main-text.small { font-size: 12px; }
.node-impact-text { font-size: 11px; color: var(--ev-text-muted); text-align: center; line-height: 1.5; }

/* 合并框内单个核心影响行业展项 */
.core-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.core-item-sep {
  width: 30px;
  height: 1px;
  background: rgba(148, 163, 184, 0.3);
  margin: 4px 0;
}

.industry-name-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.direction-arrow {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

/* 行业涨跌配色：A股 红涨绿跌 */
.text-bullish { color: var(--ev-negative); }
.text-bearish { color: var(--ev-positive); }
.text-neutral { color: var(--ev-text-primary); }

/* 变量子项 */
.var-item { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }
.var-item-name { font-size: 12px; font-weight: 600; color: var(--ev-text-primary); }
.var-item-dir { font-size: 12px; font-weight: 700; }
.dir-bullish { color: var(--ev-negative); }
.dir-bearish { color: var(--ev-positive); }
.dir-neutral { color: var(--ev-text-muted); }

/* ===== 连线箭头（线宽对齐 APP 2rpx→1px） ===== */
.graph-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px 0;
}

.arrow-line-bar {
  width: 1px;
  height: 16px;
  background: #c7d2e0; /* 对齐 APP 连线色 */
}

.arrow-head {
  font-size: 12px;
  color: var(--ev-accent);
  line-height: 1;
}

/* ===== 分叉区域 ===== */
.branch-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.branch-trunk {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.branch-trunk .arrow-line-bar { height: 14px; }

.branch-fork-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

.branch-fork-inner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.fork-h-bar {
  width: calc(100% - 70px);
  height: 1px;
  background: #c7d2e0; /* 对齐 APP 连线色 */
}

.branch-fork {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.branch-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.branch-line-bar {
  width: 1px;
  height: 12px;
  background: #c7d2e0; /* 对齐 APP 连线色 */
}

.chain-node { min-width: 90px; padding: 8px 12px; }

/* ===== AI 总结 ===== */
.graph-summary {
  width: 100%;
  padding: 10px 0 0;
  border-top: 1px solid var(--ev-border-light);
  margin-top: 12px;
}

.summary-text {
  font-size: 12px;
  color: var(--ev-text-muted);
  line-height: 1.5;
  text-align: center;
}
</style>