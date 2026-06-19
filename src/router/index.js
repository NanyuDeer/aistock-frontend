import { createRouter, createWebHistory } from 'vue-router'
// 使用懒加载导入组件
const HomeView = () => import('../views/HomeView.vue')
const LoginView = () => import('../views/LoginView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')
const SearchView = () => import('@/views/SearchView.vue')
const StockDetailView = () => import('@/views/StockDetailView.vue')
const FavoritesView = () => import('@/views/FavoritesView.vue')
const WechatMessageView = () => import('@/views/WechatMessageView.vue')
const UpdateLogsView = () => import('@/views/UpdateLogsView.vue')
const PerformanceForecastView = () => import('@/views/PerformanceForecastView.vue')
const TenxScoreView = () => import('@/views/TenxScoreView.vue')
const HotBurstView = () => import('@/views/HotBurstView.vue')
const StockMonitorView = () => import('@/views/StockMonitorView.vue')
const PotentialStockPushHistoryView = () => import('@/views/PotentialStockPushHistoryView.vue')

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: '股票资讯AI智能分析 - 首页'
    }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      title: '股票资讯AI智能分析 - 用户登录'
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: {
      title: '股票资讯AI智能分析 - 个人信息',
      requiresAuth: true  // 需要登录才能访问
    }
  },
  {
    path: '/search',
    name: 'search',
    component: SearchView,
    meta: {
      title: '股票资讯AI智能分析 - 股票搜索'
    }
  },
  {
    path: '/stock/:code',
    name: 'stockDetail',
    component: StockDetailView,
    props: true,
    meta: {
      title: '股票资讯AI智能分析 - 股票详情'
    }
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: FavoritesView,
    meta: {
      title: '股票资讯AI智能分析 - 自选股',
      requiresAuth: true  // 需要登录才能访问
    }
  },
  {
    path: '/forecast',
    name: 'performanceForecast',
    component: PerformanceForecastView,
    meta: {
      title: '股票资讯AI智能分析 - 业绩预测'
    }
  },
  {
    path: '/tenx',
    name: 'tenxScore',
    component: TenxScoreView,
    meta: {
      title: '股票资讯AI智能分析 - 十倍股评分'
    }
  },
  {
    path: '/monitor',
    redirect: '/hot-burst'
  },
  {
    path: '/hot-burst',
    name: 'hotBurst',
    component: HotBurstView,
    meta: {
      title: '股票资讯AI智能分析 - 热点爆发'
    }
  },
  {
    path: '/stock-monitor',
    name: 'stockMonitor',
    component: StockMonitorView,
    meta: {
      title: '股票资讯AI智能分析 - 个股异动'
    }
  },
  {
    path: '/potential-push-history',
    name: 'potentialPushHistory',
    component: PotentialStockPushHistoryView,
    meta: {
      title: '股票资讯AI智能分析 - 风口潜力股推送追踪'
    }
  },
  {
    path: '/wechat/:msgid',
    name: 'wechatMessage',
    component: WechatMessageView,
    props: true,
    meta: {
      title: '股票资讯AI智能分析 - 微信推送消息详情'
    }
  },
  {
    path: '/update-logs',
    name: 'updateLogs',
    component: UpdateLogsView,
    meta: {
      title: '股票资讯AI智能分析 - 更新日志'
    }
  },
  {
    path: '/tags/:tagCode',
    name: 'TagView',
    component: () => import('../views/TagView.vue'),
    meta: {
      title: '股票资讯AI智能分析 - 板块龙头'
    }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// 判断是否在微信浏览器中
function isWechatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

// 标记是否已完成 Cookie 认证检查
let cookieAuthChecked = false;
// Cookie 认证结果的 Promise（避免多次路由触发重复请求）
let cookieAuthPromise = null;

// 微信浏览器中检查 Cookie 认证状态（OAuth 回调后的首次访问）
async function checkWechatCookieAuth() {
  if (cookieAuthChecked) return false;
  if (!isWechatBrowser()) return false;
  
  cookieAuthChecked = true;
  try {
    const store = (await import('@/store')).default;
    const authed = await store.dispatch('checkCookieAuth');
    return authed;
  } catch (e) {
    console.log('[Router] Cookie 认证检查失败:', e);
    return false;
  }
}

// 路由级别的标题管理
router.beforeEach(async (to, from, next) => {
  // 动态导入 store 以避免循环依赖
  const store = (await import('@/store')).default;
  let isLoggedIn = store.getters.isLoggedIn;
  
  // 设置页面标题
  document.title = to.meta.title || '股票资讯AI智能分析 - 智能股票分析平台';

  // 微信浏览器 OAuth 回调后，登录状态通过 httpOnly Cookie 维护
  // 首次路由时检查一次 Cookie 认证
  if (!isLoggedIn && !cookieAuthChecked && isWechatBrowser()) {
    // 复用同一个 Promise，避免并发路由守卫重复请求
    if (!cookieAuthPromise) {
      cookieAuthPromise = checkWechatCookieAuth();
    }
    
    // 如果目标页面需要登录，则必须等待检查结果
    // 否则（如去首页），不阻塞路由，后台执行检查
    if (to.meta.requiresAuth) {
      const authed = await cookieAuthPromise;
      if (authed) {
        isLoggedIn = true; // 检查通过，状态已更新到 store
      }
    } else {
      // 非阻塞模式：后台执行检查，成功后 store 会自动更新，UI 响应式变化
      cookieAuthPromise.then(authed => {
        if (authed) {
          console.log('[Router] 后台 Cookie 认证成功');
        }
      });
    }
  }
  
  // 再次确认登录状态（因为上面的 check 可能更新了 store）
  isLoggedIn = store.getters.isLoggedIn;
  
  // 权限检查 - 只对需要登录的页面进行检查
  if (to.meta.requiresAuth && !isLoggedIn) {
    // 需要登录但未登录，重定向到登录页
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (isLoggedIn && to.name === 'login') {
    // 已登录用户访问登录页面，重定向到首页
    next({ name: 'home' });
  } else {
    next();
  }
})

export default router
