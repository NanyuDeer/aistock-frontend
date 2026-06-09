<template>
  <div class="hot-sector-panel">
    <!-- 标题栏 -->
    <div class="hs-header">
      <h3 class="section-title">长线趋势风口及龙头股</h3>
      <span class="hs-header-meta" v-if="displayUpdateTime">更新时间: {{ displayUpdateTime }}</span>
    </div>

    <!-- 一级窗口：龙头股列表 + 泡泡图 -->
    <div class="hs-primary-card">
      <!-- 左侧：龙头股列表 -->
      <div class="hs-primary-left">
        <div class="hs-primary-left-header">龙头股一览</div>
        <div class="hs-list-wrap">
          <div class="hs-list-head">
            <span>股票</span>
            <span>板块</span>
            <span>行情数据</span>
            <span class="hs-col-reason">龙头依据</span>
            <span>操作</span>
          </div>
          <div
            v-for="(stock, idx) in displayStocks"
            :key="stock.code + '-' + idx"
            class="hs-list-row"
            @click="goToStockByCode(stock.code)"
          >
            <div class="hs-stock-identity">
              <div class="hs-stock-title-wrap">
                <span class="hs-stock-name">{{ stock.name }}</span>
                <span class="hs-stock-code">{{ stock.code }}</span>
              </div>
            </div>
            <div class="hs-col-sector">
              <span class="hs-sector-tag" @click.stop="openModal(idx)">{{ stock.track }}</span>
            </div>
            <div class="hs-stock-metrics">
              <span class="hs-stock-price">{{ stock.latestPrice || '--' }}</span>
              <span :class="['hs-change-rate', stock.changeRate >= 0 ? 'up' : 'down']">
                {{ formatChange(stock.changeRate) }}
              </span>
            </div>
            <div class="hs-col-reason" :title="stock.leaderBasis">
              <span v-for="tag in stock.limitTags" :key="tag" class="hs-limit-tag">{{ tag }}</span>
              {{ stock.leaderBasis }}
            </div>
            <el-button
              class="hs-follow-btn"
              size="small"
              :type="isFollowed(stock.code) ? 'info' : 'primary'"
              :plain="!isFollowed(stock.code)"
              @click.stop="toggleFollow(stock.code)"
            >
              {{ isFollowed(stock.code) ? '已关注' : '关注' }}
            </el-button>
          </div>
        </div>
      </div>
      <!-- 右侧：泡泡图 -->
      <div class="hs-primary-right">
        <div class="hs-primary-right-header">风口概念</div>
        <div class="hs-bubble-wrap" ref="bubbleWrap">
          <svg ref="bubbleSvg"></svg>
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
              <div class="hs-stat-label">资金趋势</div>
              <div :class="['hs-stat-value', currentSector.amount_trend >= 0 ? 'up' : 'down']">
                {{ currentSector.amount_trend >= 0 ? '+' : '' }}{{ currentSector.amount_trend }}%
              </div>
            </div>
            <div class="hs-stat-item">
              <div class="hs-stat-label">涨/跌</div>
              <div class="hs-stat-value">
                <span class="up">{{ currentSector.up_count }}</span>/<span class="down">{{ currentSector.down_count }}</span>
              </div>
            </div>
          </div>
          <!-- 层级流向图 -->
          <div class="hs-flow-chart" ref="flowChartWrap"></div>
          <div class="hs-transfer-info">
            <div><span class="hs-label">传递方向：</span>{{ currentSector.ai_analysis?.transfer_direction || '--' }}</div>
            <div><span class="hs-label">传递判断：</span>{{ currentSector.ai_analysis?.transfer_reason || '--' }}</div>
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
                  <span v-for="tag in (s.limit_tags || [])" :key="tag" class="hs-limit-tag">{{ tag }}</span>
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
                  <span v-for="tag in (s.limit_tags || [])" :key="tag" class="hs-limit-tag">{{ tag }}</span>
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
                  <span v-for="tag in (s.limit_tags || [])" :key="tag" class="hs-limit-tag">{{ tag }}</span>
                  {{ s.reason || '' }}
                </span>
              </div>
            </div>
            <div v-else class="hs-detail-empty">暂无</div>
          </div>
          <div class="hs-ai-bar">
            <span><span class="hs-ai-label">持续原因：</span><span class="hs-ai-value">{{ currentSector.ai_analysis?.persistence_reason || '--' }}</span></span>
            <span><span class="hs-ai-label">风险：</span><span class="hs-risk-tag">{{ currentSector.ai_analysis?.risk_warning || '--' }}</span></span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import * as d3 from 'd3';

// 模拟数据：来自近期风口板块及龙头个股（后端不可用时的fallback）
const MOCK_STOCKS = [
  { code: '300308', name: '中际旭创', track: 'CPO',
    trendScore: '92', capitalSignal: '机构抱团', midSignal: '慢牛主升', expectedMultiple: '3倍',
    mainLogic: '全球800G/1.6T光模块龙头，CPO共封装方案核心供应商，AI算力扩张带来订单能见度。',
    leaderBasis: '全球800G/1.6T光模块绝对龙头，市占率超30%；CPO共封装方案核心供应商，技术领先同业1-2年。' },
  { code: '002281', name: '光迅科技', track: 'CPO',
    trendScore: '78', capitalSignal: '机构关注', midSignal: '趋势强化', expectedMultiple: '2倍',
    mainLogic: '国内光通信器件龙头，800G光模块量产交付，硅光技术突破。',
    leaderBasis: '国内光通信器件龙头，800G光模块量产交付，硅光技术突破。' },
  { code: '300476', name: '胜宏科技', track: 'PCB',
    trendScore: '88', capitalSignal: '机构抱团', midSignal: '放量上行', expectedMultiple: '2倍',
    mainLogic: '全球AI算力PCB龙头，英伟达核心供应商，高端产能释放量价齐升。',
    leaderBasis: '全球AI算力PCB市场份额第一，英伟达GB200/GB300主力供应商；全球首批6阶24层HDI量产企业。' },
  { code: '002384', name: '东山精密', track: 'PCB',
    trendScore: '80', capitalSignal: '机构关注', midSignal: '趋势强化', expectedMultiple: '2倍',
    mainLogic: 'PCB+FPC双龙头，AI服务器高阶HDI产能扩张，深度绑定海外大客户。',
    leaderBasis: 'PCB+FPC双龙头，AI服务器高阶HDI产能扩张，深度绑定海外大客户。' },
  { code: '603773', name: '沃格光电', track: '玻璃基板',
    trendScore: '90', capitalSignal: '主题资金流入', midSignal: '趋势强化', expectedMultiple: '5倍',
    mainLogic: '国内TGV玻璃基板全制程绝对龙头，先进封装核心受益标的。',
    leaderBasis: '国内TGV玻璃通孔全制程绝对龙头，唯一实现半导体玻璃基板小批量供货；1.6T光模块玻璃载板通过中际旭创、华为验证。' },
  { code: '600707', name: '彩虹股份', track: '玻璃基板',
    trendScore: '72', capitalSignal: '主题资金流入', midSignal: '强势突破', expectedMultiple: '3倍',
    mainLogic: '国内液晶玻璃基板龙头，高世代线产能国内第一。',
    leaderBasis: '国内液晶玻璃基板龙头，高世代线产能国内第一，玻璃基板技术积累深厚。' },
  { code: '600172', name: '黄河旋风', track: '培育钻石',
    trendScore: '82', capitalSignal: '主题资金流入', midSignal: '强势突破', expectedMultiple: '5倍',
    mainLogic: '国内唯一HPHT+CVD双工艺金刚石企业，CVD散热片量产卡位AI芯片散热刚需。',
    leaderBasis: '国内唯一HPHT+CVD双工艺金刚石企业；国内首条8英寸CVD金刚石热沉片2026年量产，热导率2000W+/m·K。' },
  { code: '301071', name: '力量钻石', track: '培育钻石',
    trendScore: '75', capitalSignal: '主题资金流入', midSignal: '趋势强化', expectedMultiple: '3倍',
    mainLogic: 'CVD培育钻石龙头，大尺寸金刚石技术突破，散热用金刚石片量产在即。',
    leaderBasis: 'CVD培育钻石龙头，大尺寸金刚石技术突破，散热用金刚石片量产在即。' },
  { code: '603986', name: '兆易创新', track: '存储芯片',
    trendScore: '88', capitalSignal: '机构重仓', midSignal: '趋势强化', expectedMultiple: '2倍',
    mainLogic: 'A股存储+MCU双龙头，存储涨价周期+AI端侧+车规三重红利共振。',
    leaderBasis: 'A股唯一全品类存储设计龙头，NOR Flash全球第二、国内第一；利基DRAM深度绑定长鑫存储。' },
  { code: '002156', name: '通富微电', track: '存储芯片',
    trendScore: '80', capitalSignal: '放量抢筹', midSignal: '强势突破', expectedMultiple: '3倍',
    mainLogic: '国内封测前三，HBM封装国内唯一量产，先进封装核心标的。',
    leaderBasis: '国内封测前三，HBM封装国内唯一量产；深度绑定AMD+华为海思，先进封装核心标的。' },
  { code: '601869', name: '长飞光纤', track: '光纤',
    trendScore: '90', capitalSignal: '放量抢筹', midSignal: '强势突破', expectedMultiple: '3倍',
    mainLogic: '全球光纤龙头，光纤涨价周期弹性行业第一，空芯光纤卡位下一代标准。',
    leaderBasis: '全球光纤预制棒、光纤、光缆销量连续10年第一；空芯光纤衰减0.04dB/km创世界纪录。' },
  { code: '600487', name: '亨通光电', track: '光纤',
    trendScore: '78', capitalSignal: '机构关注', midSignal: '趋势强化', expectedMultiple: '2倍',
    mainLogic: '光纤光缆+海洋通信双龙头，400G/800G光模块量产，海外布局领先。',
    leaderBasis: '光纤光缆+海洋通信双龙头，400G/800G光模块量产，海外布局领先。' },
  { code: '000636', name: '风华高科', track: 'MLCC',
    trendScore: '85', capitalSignal: '高换手承接', midSignal: '趋势强化', expectedMultiple: '3倍',
    mainLogic: '国内MLCC龙头，AI服务器+车规+存储三景气共振，涨价周期量价齐升。',
    leaderBasis: '国内MLCC产能与市占率双第一，月产能超500亿只；唯一实现阻容感全品类自主布局。' },
  { code: '300285', name: '国瓷材料', track: 'MLCC',
    trendScore: '75', capitalSignal: '机构关注', midSignal: '趋势强化', expectedMultiple: '2倍',
    mainLogic: 'MLCC陶瓷材料龙头，钛酸钡粉体国内市占率第一，MLCC上游核心材料国产替代。',
    leaderBasis: 'MLCC陶瓷材料龙头，钛酸钡粉体国内市占率第一，MLCC上游核心材料国产替代。' },
  { code: '300666', name: '江丰电子', track: '半导体材料',
    trendScore: '82', capitalSignal: '机构重仓', midSignal: '趋势强化', expectedMultiple: '3倍',
    mainLogic: '国内高纯溅射靶材龙头，7nm+制程靶材量产，半导体材料国产替代核心标的。',
    leaderBasis: '国内高纯溅射靶材龙头，7nm+制程靶材量产；全球前五大靶材制造商，台积电/中芯国际核心供应商。' },
  { code: '603078', name: '江化微', track: '半导体材料',
    trendScore: '78', capitalSignal: '机构关注', midSignal: '趋势强化', expectedMultiple: '2倍',
    mainLogic: '湿电子化学品龙头，G5等级产品量产，光刻胶配套试剂国产替代先锋。',
    leaderBasis: '湿电子化学品龙头，G5等级产品量产，光刻胶配套试剂国产替代先锋。' },
  { code: '688507', name: '索辰科技', track: '物理AI',
    trendScore: '90', capitalSignal: '游资接力', midSignal: '强势突破', expectedMultiple: '5倍',
    mainLogic: 'A股唯一物理AI底座标的，军工CAE市占率超70%，物理AI平台订单爆发。',
    leaderBasis: '国内唯一全学科自主CAE求解器+物理AI平台企业，军工CAE市占率超70%；自研"天工·开物"可微分物理仿真平台。' },
  { code: '301316', name: '凡拓数创', track: '物理AI',
    trendScore: '72', capitalSignal: '主题资金流入', midSignal: '趋势强化', expectedMultiple: '3倍',
    mainLogic: '数字孪生+3D可视化龙头，物理AI仿真可视化核心标的。',
    leaderBasis: '数字孪生+3D可视化龙头，物理AI仿真可视化核心标的。' },
  { code: '002008', name: '大族激光', track: '半导体设备',
    trendScore: '85', capitalSignal: '机构抱团', midSignal: '趋势强化', expectedMultiple: '2倍',
    mainLogic: '全球激光加工设备龙头，半导体激光切割/封装设备核心供应商。',
    leaderBasis: '全球激光加工设备龙头，半导体激光切割/封装设备核心供应商；先进封装设备国产替代先锋。' },
  { code: '688347', name: '华虹公司', track: '半导体设备',
    trendScore: '78', capitalSignal: '机构关注', midSignal: '趋势强化', expectedMultiple: '2倍',
    mainLogic: '国内特色工艺晶圆代工龙头，功率器件+MCU+RF芯片代工。',
    leaderBasis: '国内特色工艺晶圆代工龙头，功率器件+MCU+RF芯片代工，半导体设备下游核心验证平台。' },
];

const MOCK_BUBBLES = [
  { name: 'CPO', change: 0 },
  { name: 'PCB', change: 0 },
  { name: '玻璃基板', change: 0 },
  { name: '培育钻石', change: 0 },
  { name: '存储芯片', change: 0 },
  { name: '光纤', change: 0 },
  { name: 'MLCC', change: 0 },
  { name: '半导体材料', change: 0 },
  { name: '物理AI', change: 0 },
  { name: '半导体设备', change: 0 },
];

/**
 * 将后端sector数据展平为统一的股票列表格式
 * 后端每个sector包含 main_stocks + upstream_stocks + downstream_stocks
 * 统一映射为 { code, name, track, latestPrice, changeRate, leaderBasis, ... }
 */
function flattenSectorsToStocks(sectors) {
  const seen = new Set();
  const MAX_PER_SECTOR = 2;
  const stocks = [];

  for (const sector of sectors) {
    const sectorName = sector.name;
    const driver = sector.driver || '';
    const aiAnalysis = sector.ai_analysis || {};

    // 合并 main_stocks + upstream_stocks + downstream_stocks，按评分排序
    // 优先选 main_stocks，不够时从上下游补充，确保每个板块都有代表
    const allSectorStocks = [
      ...(sector.main_stocks || []).map(s => ({ ...s, chainPosition: s.chain_position || '核心', _priority: 0 })),
      ...(sector.upstream_stocks || []).map(s => ({ ...s, chainPosition: s.chain_position || '上游', _priority: 1 })),
      ...(sector.downstream_stocks || []).map(s => ({ ...s, chainPosition: s.chain_position || '下游', _priority: 1 })),
    ].sort((a, b) => {
      // 优先选 main_stocks（_priority=0），同优先级按评分排序
      if (a._priority !== b._priority) return a._priority - b._priority;
      return (b.score || 0) - (a.score || 0);
    });

    let picked = 0;
    for (const s of allSectorStocks) {
      if (picked >= MAX_PER_SECTOR) break;
      if (seen.has(s.code)) continue; // 已被其他板块选走，跳过找下一只

      seen.add(s.code);
      picked++;

      // 如果该股票是板块龙头股，优先使用 leading_stock_info 的龙头依据
      const leadInfo = sector.leading_stock_info;
      const isLeading = leadInfo && leadInfo.code === s.code;
      const leaderBasis = isLeading ? (leadInfo.reason || s.reason || '') : (s.reason || '');
      const limitTags = isLeading ? (leadInfo.limit_tags || s.limit_tags || []) : (s.limit_tags || []);

      stocks.push({
        code: s.code,
        name: s.name,
        track: sectorName,
        latestPrice: s.price != null ? String(s.price) : '--',
        changeRate: s.change_pct != null ? s.change_pct : 0,
        leaderBasis,
        score: s.score,
        chainPosition: s.chainPosition || s.chain_position,
        reasonTag: s.reason_tag || '',
        limitTags,
        inConcept: s.in_concept,
        driver: driver,
        persistence: aiAnalysis.persistence || '',
        persistenceReason: aiAnalysis.persistence_reason || '',
        heatTransfer: aiAnalysis.heat_transfer,
        transferDirection: aiAnalysis.transfer_direction || '',
        riskWarning: aiAnalysis.risk_warning || '',
      });
    }
  }

  // 按评分排名（综合评分高的排前面）
  stocks.sort((a, b) => (b.score || 0) - (a.score || 0));
  return stocks;
}

/**
 * 从后端sector数据中提取泡泡图数据（最多10个概念板块）
 */
function extractBubblesFromSectors(sectors) {
  return sectors.slice(0, 10).map(s => ({
    name: s.name,
    change: s.today_change || 0,
    frequency: s.frequency || 0,
    score: s.score || 0,
  }));
}

export default {
  name: 'HotSectorPanel',
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
    const bubbleWrap = ref(null);
    const bubbleSvg = ref(null);
    const flowChartWrap = ref(null);
    const modalVisible = ref(false);
    const modalTitle = ref('');
    const currentStock = ref(null);
    const currentSector = ref(null);
    const followedSet = ref(new Set());
    let resizeTimer = null;

    // 是否使用后端数据
    const useBackendData = computed(() => {
      return props.sectors && props.sectors.length > 0;
    });

    // 展平后的股票列表
    const displayStocks = computed(() => {
      let stocks;
      if (useBackendData.value) {
        stocks = flattenSectorsToStocks(props.sectors);
      } else {
        // 模拟数据：初始化行情为空，由quoteMap填充
        stocks = [...MOCK_STOCKS].map(s => ({
          ...s,
          latestPrice: s.latestPrice || '--',
          changeRate: s.changeRate ?? null,
        }));
      }
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

    // 泡泡图数据
    const displayBubbles = computed(() => {
      if (useBackendData.value) {
        return extractBubblesFromSectors(props.sectors);
      }
      return MOCK_BUBBLES;
    });

    // 更新时间
    const displayUpdateTime = computed(() => {
      return props.updateTime || '';
    });

    const formatChange = (val) => {
      if (val == null || val === '') return '--';
      const n = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(n)) return '--';
      return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
    };

    const isFollowed = (code) => code && followedSet.value.has(code);
    const toggleFollow = (code) => {
      if (!code) return;
      if (followedSet.value.has(code)) {
        followedSet.value.delete(code);
      } else {
        followedSet.value.add(code);
      }
    };

    const goToStockByCode = (code) => {
      if (code) router.push(`/stock/${code}`);
    };

    // ===== 泡泡图 =====
    let resizeObserver = null;

    const renderBubbleChart = () => {
      if (!bubbleWrap.value || !bubbleSvg.value) return;
      const svg = d3.select(bubbleSvg.value);

      const rect = bubbleWrap.value.getBoundingClientRect();
      const width = rect.width || 280;
      const height = rect.height || 280;

      svg.attr('width', width).attr('height', height);

      const bubbles = displayBubbles.value;
      if (!bubbles || bubbles.length === 0) return;

      const scores = bubbles.map(s => s.score || 0);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const minR = 28, maxR = 40;

      // 泡泡大小主要由板块评分决定（评分 = 频次*4 + 均涨幅*3 + 资金趋势*0.3）
      const bubbleData = bubbles.map((s, i) => {
        const raw = s.score || 0;
        // min-max归一化，确保评分差异充分放大
        const scoreNorm = (maxScore > minScore) ? (raw - minScore) / (maxScore - minScore) : 0.5;
        const r = minR + (maxR - minR) * scoreNorm;
        return { ...s, idx: i, r };
      });

      const simulation = d3.forceSimulation(bubbleData)
        .force('charge', d3.forceCollide().radius(d => d.r + 3).strength(0.8))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.06))
        .force('y', d3.forceY(height / 2).strength(0.06))
        .stop();

      for (let i = 0; i < 200; i++) simulation.tick();

      const colorScale = d3.scaleLinear()
        .domain([-3, 0, 3])
        .range(['#16a34a', '#94a3b8', '#dc2626']);

      svg.selectAll('*').remove();
      const g = svg.selectAll('g')
        .data(bubbleData).enter().append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .style('cursor', 'pointer')
        .on('click', (e, d) => {
          if (useBackendData.value) {
            // 后端数据模式：直接打开对应 sector 的详情
            const sector = props.sectors[d.idx];
            if (sector) {
              currentSector.value = sector;
              currentStock.value = null;
              modalTitle.value = sector.name + ' - 风口详情';
              modalVisible.value = true;
              nextTick(() => renderFlowChart(sector));
            }
          } else {
            openModal(d.idx);
          }
        });

      g.append('circle')
        .attr('r', d => d.r)
        .attr('fill', d => colorScale(d.change))
        .attr('fill-opacity', 0.8)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      // 概念名称换行显示（最多2行，每行4字）
      g.each(function(d) {
        const name = d.name;
        const maxCharsPerLine = 4;
        const lines = [];
        for (let i = 0; i < name.length; i += maxCharsPerLine) {
          lines.push(name.substring(i, i + maxCharsPerLine));
        }
        // 最多2行
        const displayLines = lines.slice(0, 2);
        const lineHeight = 13;
        const startY = -(displayLines.length - 1) * lineHeight / 2;

        d3.select(this).selectAll('.bubble-text').remove();
        displayLines.forEach((line, li) => {
          d3.select(this).append('text')
            .attr('class', 'bubble-text')
            .attr('y', startY + li * lineHeight)
            .style('font-size', '11px')
            .style('fill', '#fff')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'central')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .text(line + (li === 1 && lines.length > 2 ? '..' : ''));
        });
      });
    };

    const openModal = (idx) => {
      if (useBackendData.value) {
        // 后端数据模式：通过股票找到对应 sector
        const stock = displayStocks.value[idx];
        if (!stock) return;
        const sector = props.sectors.find(s => s.name === stock.track);
        if (sector) {
          currentSector.value = sector;
          currentStock.value = null;
          modalTitle.value = sector.name + ' - 风口详情';
          modalVisible.value = true;
          nextTick(() => renderFlowChart(sector));
        }
      } else {
        // 模拟数据模式：打开股票详情
        const stock = displayStocks.value[idx];
        if (!stock) return;
        currentStock.value = stock;
        currentSector.value = null;
        modalTitle.value = stock.track + ' - 龙头详情';
        modalVisible.value = true;
      }
    };

    // ===== 层级流向图 =====
    const renderFlowChart = (sector) => {
      if (!flowChartWrap.value || !sector.flow_data) return;

      const container = flowChartWrap.value;
      container.innerHTML = '';

      const { nodes, links } = sector.flow_data;
      const cRect = container.getBoundingClientRect();
      const width = Math.max(cRect.width, 200);

      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', 100);

      const defs = svg.append('defs');
      ['#2563eb', '#d97706', '#16a34a'].forEach((color, i) => {
        defs.append('marker')
          .attr('id', `arrow-flow-${i}`)
          .attr('viewBox', '0 0 10 7')
          .attr('refX', 10).attr('refY', 3.5)
          .attr('markerWidth', 6).attr('markerHeight', 4)
          .attr('orient', 'auto')
          .append('polygon')
          .attr('fill', color)
          .attr('points', '0 0, 10 3.5, 0 7');
      });

      const mainNode = nodes.find(n => n.type === 'main');
      const relatedNodes = nodes.filter(n => n.type === 'related');
      const upstreamNodes = nodes.filter(n => n.type === 'upstream');
      const downstreamNodes = nodes.filter(n => n.type === 'downstream');

      const nodeH = 20;
      const charW = 11;
      const padding = 12;
      const nodeWidths = {};
      nodes.forEach(n => {
        const cleanLabel = n.label.replace(/\(A股\)$/, '');
        n._cleanLabel = cleanLabel;
        nodeWidths[n.id] = cleanLabel.length * charW + padding;
      });
      const nw = id => nodeWidths[id] || 56;

      const positions = {};

      // 按强关联行业分组上下游
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

      const nodeGap = 22;
      const groupGap = 12;
      const relatedSlots = relatedNodes.map(n => {
        return Math.max((upGroups[n.id] || []).length, (downGroups[n.id] || []).length, 1);
      });
      const groupHeights = relatedSlots.map(s => s * nodeGap);

      const topY = 16;
      positions[mainNode.id] = { x: width / 2, y: topY };

      const conceptToFirstGap = nodeH / 2 + 14;
      let curY = topY + conceptToFirstGap;

      relatedNodes.forEach((n, i) => {
        const slotH = groupHeights[i];
        const centerY = curY + slotH / 2;
        positions[n.id] = { x: width / 2, y: centerY };

        const upList = upGroups[n.id] || [];
        upList.forEach((un, j) => {
          const yOff = (j - (upList.length - 1) / 2) * nodeGap;
          positions[un.id] = { x: width * 0.15, y: centerY + yOff };
        });

        const downList = downGroups[n.id] || [];
        downList.forEach((dn, j) => {
          const yOff = (j - (downList.length - 1) / 2) * nodeGap;
          positions[dn.id] = { x: width * 0.85, y: centerY + yOff };
        });

        curY += slotH + groupGap;
      });

      const contentBottom = Math.max(...Object.values(positions).map(p => p.y)) + nodeH / 2 + 8;
      const finalH = Math.max(contentBottom, 80);
      svg.attr('height', finalH);
      container.style.height = finalH + 'px';
      container.style.minHeight = finalH + 'px';

      // 绘制连线
      links.forEach(link => {
        const source = positions[link.source];
        const target = positions[link.target];
        if (!source || !target) return;

        let sx, sy, tx, ty;
        if (link.direction === 'upstream') {
          sx = source.x + nw(link.source) / 2; sy = source.y;
          tx = target.x - nw(link.target) / 2; ty = target.y;
        } else if (link.direction === 'downstream') {
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
        if (link.direction === 'related') {
          path = `M${sx},${sy} L${tx},${ty}`;
        } else {
          const midX = (sx + tx) / 2;
          path = `M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`;
        }

        svg.append('path')
          .attr('class', 'hs-flow-link')
          .attr('d', path)
          .attr('stroke', color)
          .attr('stroke-width', 1 + link.factor * 1.2)
          .attr('fill', 'none')
          .attr('stroke-opacity', 0.4)
          .attr('marker-end', `url(#arrow-flow-${arrowIdx})`);

        if (link.direction !== 'related') {
          const labelX = (sx + tx) / 2;
          const labelY = (sy + ty) / 2 - 3;
          svg.append('text')
            .attr('x', labelX).attr('y', labelY)
            .style('font-size', '9px')
            .style('fill', '#9ca3af')
            .style('text-anchor', 'middle')
            .text(link.factor.toFixed(2));
        }
      });

      // 绘制节点
      nodes.forEach(node => {
        const pos = positions[node.id];
        if (!pos) return;

        const g = svg.append('g')
          .attr('class', 'hs-flow-node')
          .attr('transform', `translate(${pos.x},${pos.y})`);

        let fill, stroke;
        if (node.type === 'main') { fill = '#dbeafe'; stroke = '#2563eb'; }
        else if (node.type === 'related') { fill = '#ede9fe'; stroke = '#7c3aed'; }
        else if (node.type === 'upstream') { fill = '#fffbeb'; stroke = '#d97706'; }
        else { fill = '#f0fdf4'; stroke = '#16a34a'; }

        const w = nw(node.id) + (node.type === 'main' ? 8 : 0);
        const h = node.type === 'main' ? nodeH + 4 : nodeH;

        g.append('rect')
          .attr('x', -w / 2).attr('y', -h / 2)
          .attr('width', w).attr('height', h)
          .attr('fill', fill).attr('stroke', stroke)
          .attr('rx', 4).attr('ry', 4)
          .attr('stroke-width', 1.5);

        g.append('text')
          .attr('x', 0).attr('y', 1)
          .style('font-size', '11px')
          .style('fill', '#1f2937')
          .style('text-anchor', 'middle')
          .style('dominant-baseline', 'central')
          .style('font-weight', '600')
          .text(node._cleanLabel || node.label);
      });
    };

    // 监听数据变化，重新渲染泡泡图
    watch(() => displayBubbles.value, () => {
      nextTick(renderBubbleChart);
    }, { deep: true });

    onMounted(() => {
      nextTick(renderBubbleChart);
      if (bubbleWrap.value && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          nextTick(renderBubbleChart);
        });
        resizeObserver.observe(bubbleWrap.value);
      }
      window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    });

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderBubbleChart, 300);
    };

    return {
      bubbleWrap, bubbleSvg, flowChartWrap,
      modalVisible, modalTitle, currentStock, currentSector,
      displayStocks, displayBubbles, displayUpdateTime,
      formatChange,
      isFollowed, toggleFollow,
      goToStockByCode, openModal,
    };
  },
};
</script>

<style scoped>
.hot-sector-panel {
  margin-bottom: 20px;
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.hs-header {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: 0 0 10px; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;
}
.hs-header .section-title { font-size: 1.4rem; font-weight: 700; color: var(--text-primary, #1a56db); margin: 0; }
.hs-header-meta { font-size: 12px; color: #9ca3af; white-space: nowrap; }

/* 一级窗口 */
.hs-primary-card {
  background: #fff; border: 1px solid #edf1f7; border-radius: 8px;
  display: flex; overflow: hidden;
}
.hs-primary-left {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
  border-right: 1px solid #f0f0f0;
  max-height: 316px;
}
.hs-primary-left-header {
  padding: 10px 14px 6px; font-size: 14px; font-weight: 700; color: #111827;
  border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
}

/* 列表样式 */
.hs-list-wrap { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #c1c9d4 transparent; }
.hs-list-wrap::-webkit-scrollbar { width: 6px; }
.hs-list-wrap::-webkit-scrollbar-track { background: transparent; }
.hs-list-wrap::-webkit-scrollbar-thumb { background-color: #c1c9d4; border-radius: 3px; }

.hs-list-head {
  display: grid;
  grid-template-columns: 0.8fr 1fr 1.2fr 1.5fr 0.6fr;
  align-items: center;
  padding: 6px 12px;
  font-size: 11px; color: #9ca3af; font-weight: 500;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
  position: sticky; top: 0; z-index: 1;
  white-space: nowrap;
}
.hs-list-row {
  display: grid;
  grid-template-columns: 0.8fr 1fr 1.2fr 1.5fr 0.6fr;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid #f0f3f8;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;
  min-height: 48px;
  white-space: nowrap;
}
.hs-list-row:hover { background: #fbfdff; box-shadow: inset 3px 0 0 #4f7cff; }
.hs-list-row:last-child { border-bottom: none; }

.hs-stock-identity { display: flex; align-items: center; gap: 6px; min-width: 0; }
.hs-stock-title-wrap { min-width: 0; }
.hs-stock-name { font-size: 13px; font-weight: 600; color: #111827; display: block; line-height: 1.3; }
.hs-stock-code { font-size: 11px; color: #9ca3af; display: block; }

.hs-stock-metrics { display: flex; align-items: center; gap: 6px; min-width: 0; }
.hs-stock-price { color: #111827; font-size: 13px; font-weight: 700; }
.hs-change-rate { font-weight: 700; font-size: 12px; }
.hs-change-rate.up { color: #f56c6c; }
.hs-change-rate.down { color: #67c23a; }

.hs-col-sector { min-width: 0; }
.hs-sector-tag {
  font-size: 10px; padding: 2px 8px; border-radius: 999px;
  background: #eaf2ff; color: #1d4ed8; border: 1px solid #bcd2ff;
  font-weight: 600; cursor: pointer; white-space: nowrap;
  display: inline-flex; align-items: center;
  transition: background 0.15s;
}
.hs-sector-tag:hover { background: #d4e4ff; }

.hs-col-reason {
  font-size: 12px; color: #6b7280; line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.hs-follow-btn { flex-shrink: 0; min-width: auto; padding-left: 8px; padding-right: 8px; }

/* 右侧泡泡图 */
.hs-primary-right { flex: 0 0 280px; display: flex; flex-direction: column; flex-shrink: 0; align-items: center; }
.hs-primary-right-header {
  padding: 10px 14px 6px; font-size: 14px; font-weight: 700; color: #111827;
  border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
}
.hs-bubble-wrap { width: 280px; height: 280px; position: relative; overflow: hidden; flex-shrink: 0; margin: 0 auto; }
.hs-bubble-wrap svg { width: 100%; height: 100%; display: block; }

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
.hs-sector-badge {
  display: inline-block; padding: 1px 7px; border-radius: 10px;
  font-size: 10px; font-weight: 600;
}
.badge-hot { background: #fef2f2; color: #dc2626; }
.hs-sector-stats { display: flex; gap: 10px; font-size: 12px; }
.hs-stat-item { text-align: center; }
.hs-stat-label { color: #9ca3af; font-size: 10px; }
.hs-stat-value { font-weight: 600; font-size: 12px; }
.hs-stat-value.up { color: #dc2626; }
.hs-stat-value.down { color: #16a34a; }
.hs-transfer-info {
  padding: 5px 8px; background: #f8fafc; border-radius: 4px;
  font-size: 11px; color: #6b7280; line-height: 1.5;
}
.hs-transfer-info .hs-label { color: #2563eb; font-weight: 600; }
.hs-sector-right {
  flex: 1; padding: 12px 14px;
  display: flex; flex-direction: column; gap: 0;
  min-width: 0; overflow-y: auto;
}
.hs-stock-group { margin-bottom: 8px; }
.hs-stock-group-label {
  font-size: 11px; font-weight: 600; color: #9ca3af;
  margin-bottom: 3px; display: flex; align-items: center; gap: 4px;
  padding-bottom: 2px; border-bottom: 1px solid #f0f0f0;
}
.hs-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
.dot-main { background: #dc2626; }
.dot-up { background: #d97706; }
.dot-down { background: #16a34a; }

/* 持续性标签 */
.hs-persistence-tag {
  display: inline-block; padding: 1px 6px; border-radius: 4px;
  font-size: 10px; font-weight: 600; margin-left: 4px;
}
.persistence-short { background: #fffbeb; color: #d97706; }
.persistence-mid { background: #eff6ff; color: #2563eb; }
.persistence-long { background: #f0fdf4; color: #16a34a; }

/* 层级流向图 */
.hs-flow-chart { width: 100%; height: auto; min-height: 80px; overflow-x: auto; display: flex; justify-content: center; }

/* 弹窗内股票表格 */
.hs-detail-stock-table {
  width: 100%; font-size: 11px;
}
.hs-detail-thead {
  display: grid;
  grid-template-columns: minmax(50px, 10%) minmax(80px, 22%) minmax(45px, 10%) minmax(50px, 10%) 1fr;
  color: #9ca3af; font-weight: 500; font-size: 10px;
  padding: 2px 4px 3px; border-bottom: 1px solid #f0f0f0; white-space: nowrap;
}
.hs-detail-thead .col-price { text-align: right; }
.hs-detail-thead .col-pnl { text-align: center; }
.hs-detail-row {
  display: grid;
  grid-template-columns: minmax(50px, 10%) minmax(80px, 22%) minmax(45px, 10%) minmax(50px, 10%) 1fr;
  padding: 3px 4px; border-bottom: 1px solid #f8f8f8;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hs-detail-row:hover { background: #f9fafb; }
.hs-detail-row.clickable { cursor: pointer; }
.hs-detail-row.clickable:hover { background: #eef2ff; }
.hs-detail-name { font-weight: 600; color: #111827; }
.hs-detail-industry { display: flex; align-items: center; gap: 2px; min-width: 0; overflow: hidden; }
.hs-industry-tag { font-size: 10px; color: #2563eb; padding: 0px 3px; background: #eff6ff; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1; min-width: 0; }
.hs-concept-tag { font-size: 10px; color: #dc2626; padding: 0px 3px; background: #fef2f2; border-radius: 3px; flex-shrink: 0; }
.hs-limit-tag { font-size: 10px; color: #fff; padding: 0px 4px; background: #dc2626; border-radius: 3px; margin-right: 3px; white-space: nowrap; font-weight: 600; }
.hs-detail-row .col-price { text-align: right; }
.hs-detail-row .col-pnl { text-align: center; }
.pnl-up { color: #dc2626; }
.pnl-down { color: #16a34a; }
.pnl-flat { color: #9ca3af; }
.hs-detail-reason {
  overflow: hidden; text-overflow: ellipsis;
}
.hs-detail-empty { font-size: 11px; color: #d1d5db; padding: 2px 0; }

/* AI分析条 */
.hs-ai-bar {
  display: flex; align-items: center; gap: 14px;
  padding: 5px 10px; background: #f8fafc; border-radius: 4px;
  font-size: 11px; flex-wrap: wrap; margin-top: 6px; flex-shrink: 0;
}
.hs-ai-label { color: #2563eb; font-weight: 600; white-space: nowrap; }
.hs-ai-value { color: #6b7280; }
.hs-risk-tag {
  display: inline-block; padding: 1px 5px; border-radius: 3px;
  font-size: 10px; background: #fef2f2; color: #dc2626;
}

.hs-reason-detail {
  font-size: 12px; color: #374151; line-height: 1.6;
  padding: 8px 0;
}

/* 响应式 */
@media (max-width: 900px) {
  .hs-primary-card { flex-direction: column; height: auto; max-height: none; }
  .hs-primary-left { max-height: none; }
  .hs-primary-right {
    flex: none; width: 100%;
    border-bottom: 1px solid #f0f0f0; border-right: none;
    order: -1;
    align-items: center;
  }
  .hs-bubble-wrap { width: 100%; max-width: 360px; height: 280px; }
  .hs-primary-left { border-right: none; }
  .hs-list-wrap { max-height: 280px; }
  .hs-sector-row { flex-direction: column; }
  .hs-sector-left { flex: none; width: 100%; border-right: none; border-bottom: 1px solid #f0f0f0; }
}
@media (max-width: 520px) {
  .hs-bubble-wrap { width: 100%; max-width: 300px; height: 280px; }
  .hs-list-head, .hs-list-row {
    grid-template-columns: 0.8fr 0.8fr 1fr 0.6fr;
  }
  .hs-col-reason { display: none; }
}
</style>
