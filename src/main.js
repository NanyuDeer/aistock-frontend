import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './assets/styles/global.scss'
import CacheManager from './utils/cacheManager'

const app = createApp(App)

// 应用启动时检查并清理缓存
CacheManager.checkAndClearCache();

// 应用启动时恢复登录状态，等待完成后再挂载应用
// 确保组件渲染时已有用户信息和自选股数据
async function initApp() {
  try {
    const authed = await store.dispatch('checkCookieAuth');
    if (authed) {
      console.log('[Main] Cookie 认证成功，已恢复用户状态');
    }
  } catch (e) {
    console.warn('[Main] 初始化认证失败:', e);
  }

  app.use(store)
  app.use(router)
  app.mount('#app')
}

initApp()
