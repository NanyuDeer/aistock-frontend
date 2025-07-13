import { debounce, throttle } from '@/utils/performance'

export const performanceMixin = {
  data() {
    return {
      loading: false,
      loadingText: '加载中...'
    }
  },
  
  methods: {
    // 防抖搜索
    debouncedSearch: debounce(function(keyword) {
      this.search(keyword)
    }, 300),
    
    // 节流滚动
    throttledScroll: throttle(function(event) {
      this.handleScroll(event)
    }, 100),
    
    // 显示加载状态
    showLoading(text = '加载中...') {
      this.loading = true
      this.loadingText = text
    },
    
    // 隐藏加载状态
    hideLoading() {
      this.loading = false
    },
    
    // 异步数据加载包装器
    async loadData(asyncFn, loadingText = '加载中...') {
      this.showLoading(loadingText)
      try {
        const result = await asyncFn()
        return result
      } catch (error) {
        console.error('数据加载失败:', error)
        this.$message?.error('数据加载失败，请重试')
        throw error
      } finally {
        this.hideLoading()
      }
    },
    
    // 图片预加载
    preloadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(src)
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
        img.src = src
      })
    }
  },
  
  // 性能监控
  beforeCreate() {
    this._createTime = performance.now()
  },
  
  mounted() {
    const mountTime = performance.now() - this._createTime
    if (mountTime > 100) {
      console.warn(`组件 ${this.$options.name || 'Unknown'} 挂载耗时 ${mountTime.toFixed(2)}ms`)
    }
  }
}

export default performanceMixin
