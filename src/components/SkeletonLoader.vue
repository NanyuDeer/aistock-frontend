<template>
  <div class="skeleton-wrapper">
    <!-- 股票卡片骨架屏 -->
    <div v-if="type === 'stock'" class="skeleton-stock">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-subtitle"></div>
      <div class="skeleton skeleton-price"></div>
      <div class="skeleton skeleton-change"></div>
    </div>
    
    <!-- 新闻骨架屏 -->
    <div v-else-if="type === 'news'" class="skeleton-news">
      <div class="skeleton skeleton-news-image"></div>
      <div class="skeleton-news-content">
        <div class="skeleton skeleton-news-title"></div>
        <div class="skeleton skeleton-news-summary"></div>
        <div class="skeleton skeleton-news-time"></div>
      </div>
    </div>
    
    <!-- 图表骨架屏 -->
    <div v-else-if="type === 'chart'" class="skeleton-chart">
      <div class="skeleton skeleton-chart-header"></div>
      <div class="skeleton skeleton-chart-body"></div>
    </div>
    
    <!-- 通用骨架屏 -->
    <div v-else class="skeleton-generic">
      <div v-for="i in rows" :key="i" class="skeleton skeleton-row"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SkeletonLoader',
  props: {
    type: {
      type: String,
      default: 'generic',
      validator: value => ['stock', 'news', 'chart', 'generic'].includes(value)
    },
    rows: {
      type: Number,
      default: 3
    }
  }
}
</script>

<style scoped>
.skeleton-wrapper {
  padding: 16px;
}

.skeleton {
  border-radius: 4px;
  margin-bottom: 12px;
}

/* 股票卡片骨架屏 */
.skeleton-stock {
  .skeleton-title {
    width: 60%;
    height: 20px;
  }
  
  .skeleton-subtitle {
    width: 40%;
    height: 16px;
  }
  
  .skeleton-price {
    width: 80px;
    height: 24px;
  }
  
  .skeleton-change {
    width: 60px;
    height: 18px;
  }
}

/* 新闻骨架屏 */
.skeleton-news {
  display: flex;
  gap: 12px;
  
  .skeleton-news-image {
    width: 100px;
    height: 80px;
    flex-shrink: 0;
  }
  
  .skeleton-news-content {
    flex: 1;
    
    .skeleton-news-title {
      width: 100%;
      height: 20px;
      margin-bottom: 8px;
    }
    
    .skeleton-news-summary {
      width: 80%;
      height: 16px;
      margin-bottom: 8px;
    }
    
    .skeleton-news-time {
      width: 60px;
      height: 14px;
    }
  }
}

/* 图表骨架屏 */
.skeleton-chart {
  .skeleton-chart-header {
    width: 100%;
    height: 40px;
    margin-bottom: 16px;
  }
  
  .skeleton-chart-body {
    width: 100%;
    height: 300px;
  }
}

/* 通用骨架屏 */
.skeleton-generic {
  .skeleton-row {
    width: 100%;
    height: 20px;
    
    &:nth-child(odd) {
      width: 80%;
    }
  }
}
</style>
