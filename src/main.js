import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './shared/store'
import './shared/styles/global.scss'
import CacheManager from './shared/utils/cacheManager'

const app = createApp(App)

// 应用启动时检查并清理缓存
CacheManager.checkAndClearCache();

// 先挂载应用，避免认证接口超时阻塞页面基本内容渲染
app.use(store)
app.use(router)
app.mount('#app')

// 挂载后后台恢复登录状态
store.dispatch('checkCookieAuth')
  .then((authed) => {
    if (authed) {
      console.log('[Main] Cookie 认证成功，已恢复用户状态');
    }
  })
  .catch((e) => {
    console.warn('[Main] 初始化认证失败:', e);
  });
