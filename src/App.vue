<template>
  <el-config-provider :locale="zhCn">
    <Analytics>
      <div id="app">
        <TheNavbar v-if="showHeader" />
        <router-view/>
        <TheFooter />
      </div>
    </Analytics>
  </el-config-provider>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import TheNavbar from '@/shared/components/TheNavbar.vue'
import TheFooter from '@/shared/components/TheFooter.vue'
import Analytics from '@/shared/components/Analytics.vue'

export default {
  name: 'App',
  components: {
    ElConfigProvider,
    TheNavbar,
    TheFooter,
    Analytics
  },
  setup() {
    const route = useRoute()
    const store = useStore()
    
    // 在登录页面不显示头部导航
    const showHeader = computed(() => route.name !== 'login')

    const syncFavoritesOnReturn = () => {
      if (store.getters.isLoggedIn) {
        store.dispatch('syncFavoriteStocks')
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncFavoritesOnReturn()
    }

    const favoriteAwareRoutes = new Set(['home', 'favorites', 'search', 'stockDetail', 'TagView'])
    watch(() => route.name, (routeName) => {
      if (favoriteAwareRoutes.has(routeName)) syncFavoritesOnReturn()
    })

    onMounted(() => {
      window.addEventListener('focus', syncFavoritesOnReturn)
      document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('focus', syncFavoritesOnReturn)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
    
    return {
      showHeader,
      zhCn
    }
  }
}
</script>

<style lang="scss">
#app {
  font-family: 'Noto Sans SC', 'PingFang SC', 'Helvetica Neue', Helvetica, 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-primary);
  min-height: 100vh;
  background-color: var(--background-color);
  display: flex;
  flex-direction: column;
}

/* 新增全局内容区域样式 */
.page-container {
  padding: 20px;
  padding-top: 80px; /* 确保所有页面内容不被固定导航栏遮挡 */
  max-width: 1200px;
  margin: 0 auto;
  flex: 1;
}

/* 确保router-view占据除footer外的所有空间 */
router-view {
  flex: 1;
}
</style>
