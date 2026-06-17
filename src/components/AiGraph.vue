<template>
  <div class="ai-graph-container">
    <!-- 标题 -->
    <div class="section-header">
      <h2 class="section-title">行业知识图谱</h2>
      <span class="section-subtitle" v-if="graphData">（{{ graphData.industryCount }}个行业 · {{ graphData.edgeCount }}条关系 · {{ graphData.conceptCount }}个概念）</span>
    </div>

    <!-- 概念选择 + 操作 -->
    <div class="concept-selector">
      <span class="selector-label">定位风口概念</span>
      <el-select
        v-model="selectedConcept"
        @change="handleConceptFocus"
        placeholder="输入或选择概念"
        class="concept-dropdown"
        :loading="loadingConcepts"
        clearable
        filterable
        :filter-method="filterConcepts"
      >
        <el-option
          v-for="concept in filteredConcepts"
          :key="concept.id"
          :label="concept.name"
          :value="concept.id"
        />
      </el-select>
      <el-button
        size="small"
        :type="aiFilterOn ? 'primary' : ''"
        @click="toggleAIFilter"
      >{{ aiFilterOn ? 'AI产业链 ✓' : 'AI产业链' }}</el-button>
      <el-button size="small" @click="resetFocus" :disabled="!focusedNodeId">重置聚焦</el-button>
      <el-button size="small" @click="reloadGraph" :loading="loadingGraph">刷新</el-button>
    </div>

    <!-- 图谱容器 -->
    <div class="graph-wrapper">
      <div class="graph-container" ref="graphContainerRef" v-loading="loadingGraph" element-loading-text="知识图谱加载中..."></div>

      <!-- 信息面板（图谱右上角，窄卡片） -->
      <div class="info-panel" v-if="focusedNodeId && focusInfo">
        <div class="info-panel-header">
          <span class="info-panel-title">{{ focusInfo.name }}</span>
          <span class="info-panel-type" :class="focusInfo.type">{{ focusInfo.type === 'concept' ? '概念' : '行业' }}</span>
          <el-button class="info-panel-close" size="small" :icon="Close" circle @click="resetFocus" />
        </div>
        <!-- 概念节点：关联行业（两个层级）+ 每个强关联行业的上下游 -->
        <template v-if="focusInfo.type === 'concept'">
          <div class="info-section" v-if="focusInfo.stronglyRelated?.length">
            <div class="info-section-title concept-rel">强关联行业</div>
            <div class="info-list">
              <div class="info-item" v-for="rel in focusInfo.stronglyRelated" :key="rel.industryId">
                <span class="info-item-name">{{ rel.industryName }}</span>
                <span class="info-item-detail">{{ (rel.overlapRatio * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
          <div class="info-section" v-if="focusInfo.weaklyRelated?.length">
            <div class="info-section-title concept-weak">弱关联行业</div>
            <div class="info-list">
              <div class="info-item" v-for="rel in focusInfo.weaklyRelated" :key="rel.industryId">
                <span class="info-item-name">{{ rel.industryName }}</span>
                <span class="info-item-detail">{{ (rel.overlapRatio * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
          <!-- 每个强关联行业的上下游独立框 -->
          <div
            class="info-section info-industry-box"
            v-for="rel in focusInfo.stronglyRelated"
            :key="'box-' + rel.industryId"
          >
            <div class="info-industry-box-title">{{ rel.industryName }}</div>
            <div class="info-sub-section" v-if="rel.upstream?.length">
              <div class="info-sub-title upstream">上游</div>
              <div class="info-list">
                <div class="info-item" v-for="name in rel.upstream" :key="'u-'+name">
                  <span class="info-item-name">{{ name }}</span>
                </div>
              </div>
            </div>
            <div class="info-sub-section" v-if="rel.downstream?.length">
              <div class="info-sub-title downstream">下游</div>
              <div class="info-list">
                <div class="info-item" v-for="name in rel.downstream" :key="'d-'+name">
                  <span class="info-item-name">{{ name }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <!-- 行业节点：上下游+龙头股 -->
        <template v-else>
          <div class="info-section" v-if="focusInfo.upstream.length">
            <div class="info-section-title upstream">上游</div>
            <div class="info-list">
              <div class="info-item" v-for="name in focusInfo.upstream" :key="'up-'+name">
                <span class="info-item-name">{{ name }}</span>
              </div>
            </div>
          </div>
          <div class="info-section" v-if="focusInfo.downstream.length">
            <div class="info-section-title downstream">下游</div>
            <div class="info-list">
              <div class="info-item" v-for="name in focusInfo.downstream" :key="'down-'+name">
                <span class="info-item-name">{{ name }}</span>
              </div>
            </div>
          </div>
          <div class="info-section" v-if="focusInfo.leadingStocks?.length">
            <div class="info-section-title">龙头股</div>
            <div class="info-list">
              <div class="info-item" v-for="stock in focusInfo.leadingStocks" :key="stock.code">
                <span class="info-item-name">{{ stock.name }}</span>
                <span class="info-item-detail">{{ stock.code }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 图例 -->
    <div class="graph-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: #3b82f6"></span>
        <span>二级行业</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #22c55e"></span>
        <span>概念板块</span>
      </div>
      <div class="legend-item">
        <span class="legend-line" style="background: #f59e0b"></span>
        <span>上游</span>
      </div>
      <div class="legend-item">
        <span class="legend-line" style="background: #10b981"></span>
        <span>下游</span>
      </div>
      <div class="legend-item">
        <span class="legend-line" style="background: #9ca3af; border-top: 2px dashed #9ca3af; height: 0"></span>
        <span>概念关联</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, shallowRef } from 'vue';
import { Close } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { industryKGApi } from '@/services/api';

const selectedConcept = ref('');
const concepts = ref([]);
const filteredConcepts = ref([]);
const loadingConcepts = ref(false);
const loadingGraph = ref(false);
const graphData = ref(null);
const fullGraphData = ref(null); // 保存完整图谱数据
const aiGraphData = ref(null);  // 保存AI子图数据
const focusedNodeId = ref(null);
const focusInfo = ref(null);
const graphContainerRef = ref(null);
const chartInstance = shallowRef(null);
const aiFilterOn = ref(false);

const COLORS = {
  industry: '#3b82f6', industryBorder: '#2563eb',
  concept: '#22c55e', conceptBorder: '#16a34a',
  upstreamEdge: '#f59e0b', downstreamEdge: '#10b981', conceptEdge: '#9ca3af',
  upstreamBorder: '#f59e0b', downstreamBorder: '#10b981', conceptRelBorder: '#3b82f6',
  conceptWeakBorder: '#a78bfa',
};

function filterConcepts(query) {
  if (!query) {
    filteredConcepts.value = concepts.value.slice(0, 100);
  } else {
    const q = query.toLowerCase();
    filteredConcepts.value = concepts.value.filter(c => c.name.toLowerCase().includes(q)).slice(0, 100);
  }
}

/**
 * 构建上下游映射
 */
function buildUpDownMap(kg) {
  const idToName = new Map();
  for (const ind of kg.industries || []) idToName.set(ind.id, ind.name);
  for (const c of kg.concepts || []) idToName.set(c.id, c.name);

  const upMap = new Map();
  const downMap = new Map();
  for (const edge of kg.edges || []) {
    if (edge.direction === 'upstream') {
      if (!upMap.has(edge.target)) upMap.set(edge.target, new Set());
      upMap.get(edge.target).add(edge.source);
      if (!downMap.has(edge.source)) downMap.set(edge.source, new Set());
      downMap.get(edge.source).add(edge.target);
    } else {
      if (!downMap.has(edge.target)) downMap.set(edge.target, new Set());
      downMap.get(edge.target).add(edge.source);
      if (!upMap.has(edge.source)) upMap.set(edge.source, new Set());
      upMap.get(edge.source).add(edge.target);
    }
  }
  return { idToName, upMap, downMap };
}

/**
 * 将KG数据转换为ECharts格式
 */
function convertToECharts(kg) {
  const industryNodes = (kg.industries || []).map(ind => ({
    id: ind.id, name: ind.name, type: 'industry',
    symbolSize: 16, symbol: 'circle',
    itemStyle: { color: COLORS.industry, borderColor: COLORS.industryBorder, borderWidth: 1.5 },
    label: { show: false, formatter: ind.name, fontSize: 10, color: '#374151' },
    _leadingStocks: ind.leadingStocks || [],
  }));

  const conceptNodes = (kg.concepts || []).map(c => ({
    id: c.id, name: c.name, type: 'concept',
    symbolSize: 22, symbol: 'circle',
    itemStyle: { color: COLORS.concept, borderColor: COLORS.conceptBorder, borderWidth: 2, shadowBlur: 8, shadowColor: `${COLORS.concept}66` },
    label: { show: true, formatter: c.name, fontSize: 11, fontWeight: 'bold', color: '#fff' },
    _relatedIndustries: c.relatedIndustries || [],
  }));

  const industryEdges = (kg.edges || []).map(edge => {
    const isUpstream = edge.direction === 'upstream';
    return {
      source: edge.source, target: edge.target,
      lineStyle: {
        color: isUpstream ? COLORS.upstreamEdge : COLORS.downstreamEdge,
        width: edge.confidence === 'ai_weak' ? 0.6 : 1.2,
        opacity: edge.confidence === 'ai_weak' ? 0.2 : 0.4,
        curveness: 0,
        type: edge.confidence === 'ai_weak' ? 'dashed' : 'solid',
      },
      _confidence: edge.confidence, _direction: edge.direction,
    };
  });

  const conceptEdges = [];
  for (const c of kg.concepts || []) {
    for (const rel of c.relatedIndustries || []) {
      conceptEdges.push({
        source: c.id, target: rel.industryId,
        lineStyle: { color: COLORS.conceptEdge, width: 1, opacity: 0.3, curveness: 0, type: 'dashed' },
        _type: 'concept-related', _overlapRatio: rel.overlapRatio,
      });
    }
  }

  return { nodes: [...industryNodes, ...conceptNodes], links: [...industryEdges, ...conceptEdges] };
}

/**
 * 渲染图谱
 */
function renderGraph(kg) {
  if (!graphContainerRef.value) return;
  const { nodes, links } = convertToECharts(kg);

  const option = {
    tooltip: {
      trigger: 'item', triggerOn: 'mousemove', enterable: true,
      formatter(params) {
        if (params.dataType === 'edge') {
          if (params.data._type === 'concept-related') return '<b>概念关联</b>';
          const dir = params.data._direction === 'upstream' ? '上游' : '下游';
          const conf = { ai_strong: 'AI强关联', ai_weak: 'AI弱关联' };
          return `<b>${dir}关系</b><br/>置信度: ${conf[params.data._confidence] || params.data._confidence}`;
        }
        if (params.dataType === 'node') {
          const d = params.data;
          if (d.type === 'concept') return `<b>${d.name}</b><br/>类型: 概念板块<br/>关联行业: ${d._relatedIndustries?.length || 0}个`;
          const stocks = d._leadingStocks || [];
          let html = `<b>${d.name}</b><br/>类型: 二级行业`;
          if (stocks.length > 0) html += `<br/>龙头股: ${stocks.map(s => s.name).join('、')}`;
          return html;
        }
        return params.name;
      },
    },
    series: [{
      type: 'graph', layout: 'force', roam: true, draggable: true, zoom: 0.8,
      left: 20, right: 20, top: 20, bottom: 20,
      force: { repulsion: 80, gravity: 0.08, edgeLength: [40, 120], friction: 0.6, layoutAnimation: true },
      emphasis: { focus: 'adjacency', lineStyle: { width: 3, opacity: 0.9 }, itemStyle: { shadowBlur: 16 } },
      label: { show: false, position: 'right', fontSize: 10, color: '#374151' },
      edgeSymbol: ['none', 'arrow'], edgeSymbolSize: [0, 5],
      data: nodes, links: links,
    }],
    animationDuration: 1500, animationEasingUpdate: 'quinticInOut',
  };

  if (!chartInstance.value) {
    chartInstance.value = echarts.init(graphContainerRef.value);
  }
  // 每次renderGraph都重新绑定click（因为focusOnNode会off掉）
  chartInstance.value.off('click');
  chartInstance.value.on('click', function (params) {
    if (params.dataType === 'node') focusOnNode(params.data.id);
  });
  chartInstance.value.setOption(option, true);
}

/**
 * 聚焦某个节点 - 方向性树形展开：左上游右下游
 * 核心规则：
 *   - 上游节点只继续向上游展开（更左），不再展开其下游
 *   - 下游节点只继续向下游展开（更右），不再展开其上游
 *   - 两遍扫描：先算子树高度，再分配坐标，避免标签重叠
 *   - 不强制适配画布，保证节点清晰正圆，超出部分可拖动查看
 */
function focusOnNode(nodeId) {
  if (!chartInstance.value || !graphData.value) return;
  focusedNodeId.value = nodeId;

  const kg = graphData.value;
  const { idToName, upMap, downMap } = buildUpDownMap(kg);
  const containerW = graphContainerRef.value?.clientWidth || 800;
  const containerH = graphContainerRef.value?.clientHeight || 500;

  const concept = (kg.concepts || []).find(c => c.id === nodeId);
  const industry = (kg.industries || []).find(ind => ind.id === nodeId);

  const MAX_DEPTH = 3;
  const X_SPACING = 180;  // 水平层间距
  const NODE_H = 40;      // 每个节点占用的垂直高度（含标签）
  const Y_GAP = 8;        // 节点间额外间距

  const treeNodes = [];
  const treeLinks = [];
  const placedIds = new Set();

  // ---- 第一遍：计算子树所需垂直高度 ----
  const heightCache = new Map();
  function subtreeH(id, depth, direction) {
    const key = `${id}|${depth}|${direction}`;
    if (heightCache.has(key)) return heightCache.get(key);
    if (depth >= MAX_DEPTH) { heightCache.set(key, NODE_H); return NODE_H; }

    let childIds;
    if (direction === 'up') childIds = [...(upMap.get(id) || new Set())];
    else if (direction === 'down') childIds = [...(downMap.get(id) || new Set())];
    else { heightCache.set(key, NODE_H); return NODE_H; }

    if (childIds.length === 0) { heightCache.set(key, NODE_H); return NODE_H; }

    let total = 0;
    for (const cid of childIds) total += subtreeH(cid, depth + 1, direction);
    total += (childIds.length - 1) * Y_GAP;
    const h = Math.max(NODE_H, total);
    heightCache.set(key, h);
    return h;
  }

  // ---- 第二遍：放置节点，分配坐标 ----
  function placeDirectional(id, x, yCenter, depth, direction) {
    if (placedIds.has(id)) return;
    placedIds.add(id);

    const name = idToName.get(id) || id;
    const isCpt = (kg.concepts || []).some(c => c.id === id);

    // 节点尺寸随深度递减，保证正圆形
    let symbolSize, borderColor, borderWidth, opacity, fontSize, fontWeight;
    if (direction === 'up') {
      symbolSize = Math.max(10, 14 - depth);
      borderColor = COLORS.upstreamBorder;
      borderWidth = 1.5;
      opacity = Math.max(0.55, 1 - depth * 0.12);
      fontSize = Math.max(9, 11 - depth);
      fontWeight = depth <= 1 ? '600' : 'normal';
    } else {
      symbolSize = Math.max(10, 14 - depth);
      borderColor = COLORS.downstreamBorder;
      borderWidth = 1.5;
      opacity = Math.max(0.55, 1 - depth * 0.12);
      fontSize = Math.max(9, 11 - depth);
      fontWeight = depth <= 1 ? '600' : 'normal';
    }
    if (isCpt) borderColor = COLORS.conceptBorder;

    treeNodes.push({ id, x, y: yCenter, name, symbolSize, borderColor, borderWidth, opacity, isConcept: isCpt, fontSize, fontWeight, depth });

    if (depth >= MAX_DEPTH) return;

    let childIds;
    if (direction === 'up') childIds = [...(upMap.get(id) || new Set())].filter(cid => !placedIds.has(cid));
    else childIds = [...(downMap.get(id) || new Set())].filter(cid => !placedIds.has(cid));

    if (childIds.length === 0) return;

    const nextX = direction === 'up' ? x - X_SPACING : x + X_SPACING;
    const childHeights = childIds.map(cid => subtreeH(cid, depth + 1, direction));
    const totalH = childHeights.reduce((a, b) => a + b, 0) + (childIds.length - 1) * Y_GAP;
    let curY = yCenter - totalH / 2;

    for (let i = 0; i < childIds.length; i++) {
      const cy = curY + childHeights[i] / 2;
      treeLinks.push({ source: id, target: childIds[i], color: direction === 'up' ? COLORS.upstreamEdge : COLORS.downstreamEdge, opacity: 0.7 });
      placeDirectional(childIds[i], nextX, cy, depth + 1, direction);
      curY += childHeights[i] + Y_GAP;
    }
  }

  // ---- 行业节点布局 ----
  if (industry) {
    const rootX = 0;
    const rootY = 0;
    placedIds.add(nodeId);
    treeNodes.push({
      id: nodeId, x: rootX, y: rootY, name: industry.name,
      symbolSize: 18, borderColor: COLORS.industryBorder, borderWidth: 2.5,
      opacity: 1, isConcept: false, fontSize: 13, fontWeight: 'bold', depth: 0,
    });

    const upIds = [...(upMap.get(nodeId) || new Set())].filter(uid => !placedIds.has(uid));
    const downIds = [...(downMap.get(nodeId) || new Set())].filter(did => !placedIds.has(did));

    if (upIds.length > 0) {
      const upHeights = upIds.map(uid => subtreeH(uid, 1, 'up'));
      const upTotalH = upHeights.reduce((a, b) => a + b, 0) + (upIds.length - 1) * Y_GAP;
      let curY = rootY - upTotalH / 2;
      for (let i = 0; i < upIds.length; i++) {
        const cy = curY + upHeights[i] / 2;
        treeLinks.push({ source: nodeId, target: upIds[i], color: COLORS.upstreamEdge, opacity: 0.8 });
        placeDirectional(upIds[i], rootX - X_SPACING, cy, 1, 'up');
        curY += upHeights[i] + Y_GAP;
      }
    }

    if (downIds.length > 0) {
      const downHeights = downIds.map(did => subtreeH(did, 1, 'down'));
      const downTotalH = downHeights.reduce((a, b) => a + b, 0) + (downIds.length - 1) * Y_GAP;
      let curY = rootY - downTotalH / 2;
      for (let i = 0; i < downIds.length; i++) {
        const cy = curY + downHeights[i] / 2;
        treeLinks.push({ source: nodeId, target: downIds[i], color: COLORS.downstreamEdge, opacity: 0.8 });
        placeDirectional(downIds[i], rootX + X_SPACING, cy, 1, 'down');
        curY += downHeights[i] + Y_GAP;
      }
    }

    const directUpIds = [...(upMap.get(nodeId) || new Set())];
    const directDownIds = [...(downMap.get(nodeId) || new Set())];
    buildFocusInfo(nodeId, directUpIds, directDownIds, null, [], [], new Set(), new Set());

  // ---- 概念节点布局 ----
  } else if (concept) {
    const rootX = 0;
    const rootY = 0;
    placedIds.add(nodeId);
    treeNodes.push({
      id: nodeId, x: rootX, y: rootY, name: concept.name,
      symbolSize: 20, borderColor: COLORS.conceptBorder, borderWidth: 2.5,
      opacity: 1, isConcept: true, fontSize: 13, fontWeight: 'bold', depth: 0,
    });

    const allRel = concept.relatedIndustries || [];
    const strongIds = allRel.filter((_, i) => i < 3).map(r => r.industryId);
    const weakIds = allRel.filter((_, i) => i >= 3).map(r => r.industryId);

    const strongSpacing = NODE_H + Y_GAP;
    let curY = rootY + NODE_H + 20;

    for (let i = 0; i < strongIds.length; i++) {
      const indId = strongIds[i];
      if (placedIds.has(indId)) continue;
      placedIds.add(indId);
      const name = idToName.get(indId) || indId;
      const indY = curY + i * strongSpacing;

      treeNodes.push({
        id: indId, x: rootX, y: indY, name,
        symbolSize: 14, borderColor: COLORS.conceptRelBorder, borderWidth: 2,
        opacity: 1, isConcept: false, fontSize: 11, fontWeight: '600', depth: 1,
      });
      treeLinks.push({ source: nodeId, target: indId, color: COLORS.conceptEdge, opacity: 0.6 });

      const upIds = [...(upMap.get(indId) || new Set())].filter(uid => !placedIds.has(uid));
      if (upIds.length > 0) {
        const upHeights = upIds.map(uid => subtreeH(uid, 2, 'up'));
        const upTotalH = upHeights.reduce((a, b) => a + b, 0) + (upIds.length - 1) * Y_GAP;
        let uy = indY - upTotalH / 2;
        for (let j = 0; j < upIds.length; j++) {
          const cy = uy + upHeights[j] / 2;
          treeLinks.push({ source: indId, target: upIds[j], color: COLORS.upstreamEdge, opacity: 0.7 });
          placeDirectional(upIds[j], rootX - X_SPACING, cy, 2, 'up');
          uy += upHeights[j] + Y_GAP;
        }
      }

      const downIds = [...(downMap.get(indId) || new Set())].filter(did => !placedIds.has(did));
      if (downIds.length > 0) {
        const downHeights = downIds.map(did => subtreeH(did, 2, 'down'));
        const downTotalH = downHeights.reduce((a, b) => a + b, 0) + (downIds.length - 1) * Y_GAP;
        let dy = indY - downTotalH / 2;
        for (let j = 0; j < downIds.length; j++) {
          const cy = dy + downHeights[j] / 2;
          treeLinks.push({ source: indId, target: downIds[j], color: COLORS.downstreamEdge, opacity: 0.7 });
          placeDirectional(downIds[j], rootX + X_SPACING, cy, 2, 'down');
          dy += downHeights[j] + Y_GAP;
        }
      }
    }

    const weakStartY = curY + strongIds.length * strongSpacing + 15;
    for (let i = 0; i < weakIds.length; i++) {
      const indId = weakIds[i];
      if (placedIds.has(indId)) continue;
      placedIds.add(indId);
      const name = idToName.get(indId) || indId;
      treeNodes.push({
        id: indId, x: rootX, y: weakStartY + i * (NODE_H - 5), name,
        symbolSize: 10, borderColor: COLORS.conceptWeakBorder, borderWidth: 1,
        opacity: 0.5, isConcept: false, fontSize: 9, fontWeight: 'normal', depth: 1,
      });
      treeLinks.push({ source: nodeId, target: indId, color: COLORS.conceptEdge, opacity: 0.3 });
    }

    buildFocusInfo(nodeId, [], [], concept, strongIds, weakIds, new Set(), new Set());
  } else {
    return;
  }

  // ---- 计算缩放：保证根节点区域清晰，不强制适配全部内容 ----
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const tn of treeNodes) {
    if (tn.x < minX) minX = tn.x;
    if (tn.x > maxX) maxX = tn.x;
    if (tn.y < minY) minY = tn.y;
    if (tn.y > maxY) maxY = tn.y;
  }
  const treeW = (maxX - minX) || 1;
  const treeH = (maxY - minY) || 1;

  // ECharts auto-fit scale: 把全部节点缩进画布的缩放比
  const autoFitScale = Math.min(containerW / treeW, containerH / treeH);
  // 期望最小缩放：每个 X_SPACING 至少占 120px，保证节点不挤
  const desiredScale = 120 / X_SPACING;
  // 如果 auto-fit 已经足够清晰则 zoom=1，否则放大到期望缩放
  const zoom = autoFitScale < desiredScale ? desiredScale / autoFitScale : 1;

  // ---- 构建ECharts数据 ----
  const rootTn = treeNodes[0];
  const echartsNodes = treeNodes.map(tn => {
    const baseColor = tn.isConcept ? COLORS.concept : COLORS.industry;
    return {
      id: tn.id, name: tn.name, x: tn.x, y: tn.y,
      symbolSize: tn.symbolSize, symbol: 'circle',
      itemStyle: {
        color: baseColor, borderColor: tn.borderColor, borderWidth: tn.borderWidth, opacity: tn.opacity,
        ...(tn.depth === 0 ? { shadowBlur: 12, shadowColor: tn.isConcept ? `${COLORS.concept}66` : `${COLORS.industry}66` } : {}),
      },
      label: { show: true, formatter: tn.name, fontSize: tn.fontSize, fontWeight: tn.fontWeight, color: '#374151', position: 'right' },
      _type: tn.isConcept ? 'concept' : 'industry',
    };
  });

  const echartsLinks = treeLinks.map(tl => ({
    source: tl.source, target: tl.target,
    lineStyle: { color: tl.color, width: 1.5, opacity: tl.opacity, curveness: 0, type: 'solid' },
    edgeSymbol: ['none', 'arrow'], edgeSymbolSize: [0, 4],
  }));

  chartInstance.value.setOption({
    series: [{
      type: 'graph', layout: 'none', roam: true, draggable: true,
      zoom: zoom,
      center: [rootTn.x, rootTn.y],
      left: 0, right: 0, top: 0, bottom: 0,
      emphasis: { focus: 'adjacency', lineStyle: { width: 2.5, opacity: 0.9 }, itemStyle: { shadowBlur: 10 } },
      label: { show: true, position: 'right', fontSize: 10, color: '#374151' },
      data: echartsNodes, links: echartsLinks,
    }],
  }, true);
}

/**
 * 构建信息面板数据（概念关联行业显示上下游两个层级）
 */
function buildFocusInfo(nodeId, upIds, downIds, concept, stronglyRelatedIds, weaklyRelatedIds, conceptUpIds, conceptDownIds) {
  if (!graphData.value) return;
  const { idToName, upMap, downMap } = buildUpDownMap(graphData.value);

  if (concept) {
    const allRel = concept.relatedIndustries || [];
    const strong = allRel.filter((_, i) => i < 3).map(r => {
      const indUpIds = [...(upMap.get(r.industryId) || new Set())];
      const indDownIds = [...(downMap.get(r.industryId) || new Set())];
      return {
        industryId: r.industryId,
        industryName: idToName.get(r.industryId) || r.industryId,
        overlapRatio: r.overlapRatio,
        upstream: indUpIds.map(id => idToName.get(id) || id),
        downstream: indDownIds.map(id => idToName.get(id) || id),
      };
    });
    const weak = allRel.filter((_, i) => i >= 3).map(r => ({
      industryId: r.industryId,
      industryName: idToName.get(r.industryId) || r.industryId,
      overlapRatio: r.overlapRatio,
    }));
    focusInfo.value = {
      name: concept.name, type: 'concept',
      stronglyRelated: strong, weaklyRelated: weak,
      upstream: [], downstream: [], leadingStocks: [],
    };
    return;
  }

  const industry = (graphData.value.industries || []).find(ind => ind.id === nodeId);
  if (industry) {
    focusInfo.value = {
      name: industry.name, type: 'industry',
      stronglyRelated: [], weaklyRelated: [],
      upstream: upIds.map(id => idToName.get(id) || id),
      downstream: downIds.map(id => idToName.get(id) || id),
      leadingStocks: industry.leadingStocks || [],
    };
    return;
  }
  focusInfo.value = null;
}

function handleConceptFocus(conceptId) {
  if (!conceptId) { resetFocus(); return; }
  focusOnNode(conceptId);
}

function resetFocus() {
  focusedNodeId.value = null;
  focusInfo.value = null;
  selectedConcept.value = '';
  if (graphData.value && chartInstance.value) renderGraph(graphData.value);
}

/**
 * 切换AI产业链筛选
 */
async function toggleAIFilter() {
  aiFilterOn.value = !aiFilterOn.value;
  focusedNodeId.value = null;
  focusInfo.value = null;
  selectedConcept.value = '';

  if (aiFilterOn.value) {
    // 加载AI子图
    if (!aiGraphData.value) {
      loadingGraph.value = true;
      try {
        const result = await industryKGApi.getAISubGraph();
        if (result.code === 200) {
          aiGraphData.value = result.data;
        }
      } catch (error) {
        console.error('加载AI产业链子图失败:', error);
      } finally {
        loadingGraph.value = false;
      }
    }
    if (aiGraphData.value) {
      graphData.value = aiGraphData.value;
      await nextTick();
      renderGraph(aiGraphData.value);
    }
  } else {
    // 恢复完整图谱
    if (fullGraphData.value) {
      graphData.value = fullGraphData.value;
      await nextTick();
      renderGraph(fullGraphData.value);
    }
  }
}

/**
 * 刷新图谱
 */
async function reloadGraph() {
  loadingGraph.value = true;
  try {
    const result = await industryKGApi.getFullGraph();
    if (result.code === 200) {
      fullGraphData.value = result.data;
      aiGraphData.value = null; // 清除AI子图缓存，下次重新获取
      if (aiFilterOn.value) {
        // 如果当前是AI筛选模式，重新获取AI子图
        const aiResult = await industryKGApi.getAISubGraph();
        if (aiResult.code === 200) {
          aiGraphData.value = aiResult.data;
          graphData.value = aiGraphData.value;
        }
      } else {
        graphData.value = result.data;
      }
      await nextTick();
      renderGraph(graphData.value);
    }
  } catch (error) {
    console.error('加载知识图谱失败:', error);
  } finally {
    loadingGraph.value = false;
  }
}

async function loadFullGraph() {
  loadingGraph.value = true;
  try {
    const result = await industryKGApi.getFullGraph();
    if (result.code === 200) {
      fullGraphData.value = result.data;
      graphData.value = result.data;
      await nextTick();
      renderGraph(result.data);
    }
  } catch (error) {
    console.error('加载知识图谱失败:', error);
  } finally {
    loadingGraph.value = false;
  }
}

async function loadConcepts() {
  loadingConcepts.value = true;
  try {
    const result = await industryKGApi.getConcepts();
    if (result.code === 200) {
      concepts.value = result.data.concepts;
      filteredConcepts.value = concepts.value.slice(0, 100);
    }
  } catch (error) {
    console.error('加载概念列表失败:', error);
  } finally {
    loadingConcepts.value = false;
  }
}

function handleResize() {
  if (chartInstance.value) chartInstance.value.resize();
}

onMounted(() => {
  loadFullGraph();
  loadConcepts();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (chartInstance.value) { chartInstance.value.dispose(); chartInstance.value = null; }
});
</script>

<style scoped>
.ai-graph-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.section-subtitle {
  font-size: 13px;
  color: #9ca3af;
}

.concept-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  flex-wrap: wrap;
}

.selector-label {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
}

.concept-dropdown {
  width: 240px;
}

.graph-wrapper {
  position: relative;
}

.graph-container {
  width: 100%;
  height: calc(100vh - 280px);
  min-height: 500px;
  max-height: 700px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

/* 信息面板 - 缩窄 */
.info-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 170px;
  max-height: calc(100% - 24px);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
  z-index: 10;
  font-size: 11px;
}

.info-panel-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border-bottom: 1px solid #f1f5f9;
}

.info-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-panel-type {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 500;
  flex-shrink: 0;
}

.info-panel-type.concept { background: #dcfce7; color: #16a34a; }
.info-panel-type.industry { background: #dbeafe; color: #2563eb; }

.info-panel-close {
  width: 20px !important;
  height: 20px !important;
  min-height: 20px !important;
  padding: 0 !important;
}

.info-section {
  padding: 6px 10px;
}

.info-section + .info-section {
  border-top: 1px solid #f1f5f9;
}

.info-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 3px;
}

.info-section-title.upstream { color: #f59e0b; }
.info-section-title.downstream { color: #10b981; }
.info-section-title.concept-rel { color: #3b82f6; }
.info-section-title.concept-weak { color: #a78bfa; }

.info-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding: 1px 0;
}

.info-item-name {
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

.info-item-detail {
  color: #9ca3af;
  font-size: 10px;
  flex-shrink: 0;
}

.info-industry-box {
  background: #f8fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.info-industry-box-title {
  font-size: 11px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 3px;
}

.info-sub-section {
  margin-top: 2px;
}

.info-sub-title {
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 1px;
}

.info-sub-title.upstream { color: #f59e0b; }
.info-sub-title.downstream { color: #10b981; }

.info-empty {
  font-size: 11px;
  color: #d1d5db;
  padding: 2px 0;
}

.graph-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-line {
  width: 20px;
  height: 2px;
  border-radius: 1px;
}
</style>
