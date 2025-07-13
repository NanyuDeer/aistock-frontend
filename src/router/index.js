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
const MonitorDashboardView = () => import('@/views/MonitorDashboardView.vue')

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
      title: '股票资讯AI智能分析 - 个人信息'
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
      title: '股票资讯AI智能分析 - 自选股'
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
    path: '/monitor',
    name: 'monitor',
    component: MonitorDashboardView,
    meta: {
      title: '股票资讯AI智能分析 - 服务器监控',
      requiresAdmin: true  // 可选：仅管理员可访问
    }
  },
  // 添加标签页面路由
  {
    path: '/tags/:tagName',
    name: 'TagView',
    component: () => import('../views/TagView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// 路由级别的标题管理
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('token') !== null;
  // 设置页面标题
  document.title = to.meta.title || '股票资讯AI智能分析 - 智能股票分析平台';
  
  // 定义需要登录才能访问的页面
  const requiresAuth = ['Profile']; // 只有个人信息页面需要登录
  
  // 权限检查 - 只对需要登录的页面进行保护
  if (!isLoggedIn && requiresAuth.includes(to.name)) {
    next({ name: 'login' });
  } else if (isLoggedIn && to.name === 'login') {
    // 已登录用户访问登录页面，重定向到首页
    next({ name: 'home' });
  } else {
    next();
  }
})

export default router
