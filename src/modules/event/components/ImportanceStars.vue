<template>
  <span class="importance-stars" :style="{ gap: gap + 'px' }">
    <span
      v-for="i in 5"
      :key="i"
      class="importance-star"
      :class="{ active: i <= level }"
      :style="{ fontSize: size + 'px' }"
    >★</span>
  </span>
</template>

<script>
/**
 * 重要性星级评分组件
 *
 * 展示 1-5 星，金色实心星 + 灰色空心星
 */
export default {
  name: 'ImportanceStars',
  props: {
    /** 重要性等级 1-5 */
    level: {
      type: Number,
      default: 3,
    },
    /** 星星大小 px */
    size: {
      type: Number,
      default: 12,
    },
    /** 间距 px */
    gap: {
      type: Number,
      default: 1,
    },
  },
}
</script>

<style scoped>
.importance-stars {
  display: inline-flex;
  align-items: center;
}

.importance-star {
  color: #e5e7eb;
  line-height: 1;
  transition: color 0.2s;
}

.importance-star.active {
  color: #f59e0b;
}
</style>