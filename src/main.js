import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import lazyload from './directives/lazyload'
import './assets/styles/global.scss'

const app = createApp(App)

// 注册懒加载指令
app.directive('lazy', lazyload)

// 异步获取用户信息，避免阻塞应用启动
const initializeApp = async () => {
  try {
    await store.dispatch('fetchUserInfo');
  } catch (error) {
    console.error('无法获取用户信息，已清除登录状态');
    store.commit('logout');
  }
};

app.use(store)
app.use(router)
app.mount('#app')

// 应用挂载后再获取用户信息
initializeApp();
