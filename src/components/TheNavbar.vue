<template>
  <div class="navbar">
    <div class="container navbar-container">
      <div class="logo">
        <router-link to="/">
          <img src="@/assets/logo.png" alt="股票资讯AI智能分析" />
          <div class="logo-divider"></div>
          <span class="logo-text">股票资讯AI智能分析</span>
        </router-link>
      </div>
      <div class="menu-toggle" @click="toggleMobileMenu">
        <img v-if="!mobileMenuOpen" src="@/assets/menu.svg" alt="菜单" />
        <i v-else class="el-icon-close"></i>
      </div>
      <div class="mobile-menu" :class="{ 'open': mobileMenuOpen }">
        <router-link to="/" class="menu-item" @click="closeMobileMenu">首页</router-link>
        <router-link to="/search" class="menu-item" @click="closeMobileMenu">搜索股票</router-link>
        <router-link to="/forecast" class="menu-item" @click="closeMobileMenu">业绩预测</router-link>
        <router-link to="/tenx" class="menu-item" @click="closeMobileMenu">十倍股评分</router-link>
        <router-link to="/hotspot-outbreak" class="menu-item" @click="closeMobileMenu">风口爆发</router-link>
        <router-link v-if="isLoggedIn" to="/favorites" class="menu-item" @click="closeMobileMenu">我的自选股</router-link>
        <template v-if="isLoggedIn">
          <div class="menu-item" @click="openSubscribeDialog">消息订阅</div>
          <router-link to="/profile" class="menu-item" @click="closeMobileMenu">个人信息</router-link>
          <div class="menu-item" @click="handleLogout">退出登录</div>
        </template>
        <template v-else>
          <router-link to="/login" class="menu-item" @click="closeMobileMenu">登录</router-link>
        </template>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-item" @click="closeMobileMenu">首页</router-link>
        <router-link to="/search" class="nav-item" @click="closeMobileMenu">搜索股票</router-link>
        <router-link to="/forecast" class="nav-item" @click="closeMobileMenu">业绩预测</router-link>
        <router-link to="/tenx" class="nav-item" @click="closeMobileMenu">十倍股评分</router-link>
        <router-link to="/hotspot-outbreak" class="nav-item" @click="closeMobileMenu">风口爆发</router-link>
        <router-link v-if="isLoggedIn" to="/favorites" class="nav-item" @click="closeMobileMenu">我的自选股</router-link>
      </div>
      <div class="user-area">
        <template v-if="isLoggedIn">
          <!-- 消息订阅按钮 -->
          <div class="subscribe-btn" @click="openSubscribeDialog" title="消息订阅">
            <i class="el-icon-bell"></i>
            <span v-if="subscribeStatus === 'subscribed'" class="subscribe-dot"></span>
          </div>
          <el-dropdown trigger="click">
            <div class="user-avatar">
              <img :src="currentUser?.avatar || defaultAvatar" alt="头像" />
              <span>{{ currentUser?.name || '用户' }}</span>
              <i class="el-icon-arrow-down"></i>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>
                  <router-link to="/profile" @click="closeMobileMenu">个人信息</router-link>
                </el-dropdown-item>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <router-link to="/login" class="login-btn" @click="closeMobileMenu">
            <el-button type="primary" size="small">登录</el-button>
          </router-link>
        </template>
      </div>
    </div>

    <!-- 消息订阅弹窗 -->
    <el-dialog
      v-model="subscribeDialogVisible"
      title="消息订阅"
      width="420px"
      :close-on-click-modal="true"
      class="subscribe-dialog"
    >
      <div class="subscribe-content">
        <div class="subscribe-desc">
          订阅后，飞书机器人将每日推送3次资讯到您的飞书账号：
        </div>
        <div class="subscribe-features">
          <div class="feature-item">
            <i class="el-icon-document"></i>
            <span>自选股资讯推送（个股公告/新闻研判）</span>
          </div>
          <div class="feature-item">
            <i class="el-icon-trophy"></i>
            <span>风口爆发股推送（每日3支风口股票）</span>
          </div>
          <div class="feature-item">
            <i class="el-icon-time"></i>
            <span>推送时间：9:00 / 13:00 / 19:00</span>
          </div>
        </div>

        <div v-if="subscribeStatus === 'unauthorized'" class="subscribe-oauth">
          <p class="oauth-tip">需要授权飞书账号以接收推送消息</p>
          <el-button type="primary" @click="handleFeishuAuth" :loading="oauthLoading">
            授权飞书账号
          </el-button>
        </div>

        <div v-else-if="subscribeStatus === 'subscribed'" class="subscribe-active">
          <div class="active-status">
            <i class="el-icon-success"></i>
            <span>已订阅，飞书推送已开启</span>
          </div>
          <el-button type="danger" plain size="small" @click="handleUnsubscribe">
            取消订阅
          </el-button>
        </div>

        <div v-else class="subscribe-idle">
          <el-button type="primary" @click="handleSubscribe" :loading="subscribeLoading">
            开启订阅
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import CacheManager from '../utils/cacheManager'
import api from '../services/api'

export default {
  name: 'TheNavbar',
  setup() {
    const store = useStore()
    const router = useRouter()
    const defaultAvatar = require('@/assets/default-avatar.svg')
    
    const isLoggedIn = computed(() => store.getters.isLoggedIn)
    const currentUser = computed(() => store.getters.currentUser)
    
    const handleLogout = async () => {
      await CacheManager.clearAllCache()
      await store.dispatch('logout')
      router.push('/')
    }

    const mobileMenuOpen = ref(false)

    const toggleMobileMenu = () => {
      mobileMenuOpen.value = !mobileMenuOpen.value
    }

    const closeMobileMenu = () => {
      mobileMenuOpen.value = false
    }

    // 消息订阅相关
    const subscribeDialogVisible = ref(false)
    const subscribeStatus = ref('idle') // idle | unauthorized | subscribed
    const subscribeLoading = ref(false)
    const oauthLoading = ref(false)

    const openSubscribeDialog = () => {
      closeMobileMenu()
      subscribeDialogVisible.value = true
      checkSubscribeStatus()
    }

    const checkSubscribeStatus = async () => {
      try {
        const res = await api.get('/api/users/me/subscription')
        if (res?.data?.status === 'subscribed') {
          subscribeStatus.value = 'subscribed'
        } else if (res?.data?.status === 'unauthorized') {
          subscribeStatus.value = 'unauthorized'
        } else {
          subscribeStatus.value = 'idle'
        }
      } catch {
        subscribeStatus.value = 'idle'
      }
    }

    const handleSubscribe = async () => {
      subscribeLoading.value = true
      try {
        await api.post('/api/users/me/subscription', { action: 'subscribe' })
        subscribeStatus.value = 'subscribed'
      } catch (err) {
        console.warn('[Navbar] 订阅失败:', err)
      } finally {
        subscribeLoading.value = false
      }
    }

    const handleUnsubscribe = async () => {
      try {
        await api.post('/api/users/me/subscription', { action: 'unsubscribe' })
        subscribeStatus.value = 'idle'
      } catch (err) {
        console.warn('[Navbar] 取消订阅失败:', err)
      }
    }

    const handleFeishuAuth = () => {
      oauthLoading.value = true
      // 跳转到飞书OAuth授权页面
      const feishuAppId = process.env.VUE_APP_FEISHU_APP_ID || ''
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/feishu/callback`)
      const state = encodeURIComponent(window.location.pathname)
      const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${feishuAppId}&redirect_uri=${redirectUri}&state=${state}`
      window.location.href = authUrl
    }

    onMounted(() => {
      if (isLoggedIn.value) {
        checkSubscribeStatus()
      }
    })
    
    return {
      isLoggedIn,
      currentUser,
      defaultAvatar,
      handleLogout,
      mobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
      subscribeDialogVisible,
      subscribeStatus,
      subscribeLoading,
      oauthLoading,
      openSubscribeDialog,
      handleSubscribe,
      handleUnsubscribe,
      handleFeishuAuth,
    }
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .navbar-container {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  
  .logo {
    min-width: 0;

    a {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: var(--primary-color);
      font-weight: bold;
      font-size: 1.35rem;
      min-width: 0;
      
      img {
        height: 36px;
      }
      
      .logo-divider {
        width: 1.5px;
        height: 22px;
        background: var(--primary-color);
        margin: 0 5px;
        position: relative;
      }
      
      .logo-text {
        white-space: nowrap;
      }
    }
  }

  .menu-toggle {
    display: none;
    font-size: 1.5rem;
    cursor: pointer;
    width: 32px; 
    height: 32px; 
    align-items: center; 
    justify-content: center; 

    @media (max-width: 768px) {
      display: flex;
      z-index: 1010;
    }

    img {
      width: 24px;
      height: 24px;
    }

    i {
      font-size: 24px;
    }
  }

  .mobile-menu {
    display: none;
    flex-direction: column;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 10px 0;
    z-index: 1000;
    overflow-y: auto;

    @media (max-width: 768px) {
      &.open {
        display: flex !important;
      }
    }

    .menu-item {
      text-decoration: none;
      color: var(--text-primary);
      padding: 10px 20px;
      text-align: center;
      border-bottom: 1px solid var(--border-color);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: var(--background-hover);
      }
    }
  }
  
  .nav-links {
    display: flex;
    
    .nav-item {
      text-decoration: none;
      color: var(--text-primary);
      margin: 0 15px;
      padding: 10px 0;
      position: relative;
      
      &.router-link-active {
        color: var(--primary-color);
        
        &:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: var(--primary-color);
        }
      }
    }

    @media (max-width: 768px) {
      display: none;
    }
  }

  @media (max-width: 1100px) {
    .logo {
      a {
        font-size: 1.1rem;

        .logo-divider,
        .logo-text {
          display: none;
        }
      }
    }

    .nav-links {
      .nav-item {
        margin: 0 10px;
      }
    }
  }
  
  .user-area {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .subscribe-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;

      &:hover {
        background: #f5f5f5;
      }

      i {
        font-size: 20px;
        color: #666;
      }

      .subscribe-dot {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #67c23a;
        border: 2px solid #fff;
      }
    }
    
    .user-avatar {
      display: flex;
      align-items: center;
      cursor: pointer;
      
      img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid #e0e0e0;
        margin-right: 8px;
      }
      
      i {
        margin-left: 5px;
        font-size: 12px;
        color: #999;
      }
    }
    
    a.login-btn {
      text-decoration: none;
      display: inline-block;
    }
    
    .login-btn {
      text-decoration: none;
      padding: 0;
      border-radius: 4px;
      color: #fff;
      background-color: transparent;
    }
    .login-btn .el-button {
      background-color: var(--primary-color);
      color: #fff;
      border-radius: 20px;
      border: none;
      box-shadow: none;
      padding: 4px 18px;
      font-size: 0.92rem;
      font-weight: 500;
      letter-spacing: 1px;
      transition: background 0.2s;
      min-width: 60px;
      height: 32px;
      line-height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-btn .el-button.router-link-active,
    a.login-btn.router-link-active .el-button {
      background-color: var(--primary-color);
      color: #fff;
      box-shadow: 0 0 0 2px var(--primary-color) inset;
    }

    @media (max-width: 768px) {
      display: none;
    }
  }

  @media (max-width: 576px) {
    padding: 0 10px;

    .navbar-container {
      height: 60px;
    }

    .logo {
      a {
        font-size: 1rem;
        max-width: calc(100vw - 72px);

        img {
          height: 30px;
        }

        .logo-divider,
        .logo-text {
          display: none;
        }
      }
    }
  }
}

// 消息订阅弹窗样式
.subscribe-content {
  .subscribe-desc {
    font-size: 0.95rem;
    color: #606266;
    margin-bottom: 16px;
  }

  .subscribe-features {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;

    .feature-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      font-size: 0.9rem;
      color: #303133;

      i {
        font-size: 18px;
        color: var(--primary-color);
      }

      &:not(:last-child) {
        border-bottom: 1px solid #ebeef5;
      }
    }
  }

  .subscribe-oauth {
    text-align: center;

    .oauth-tip {
      font-size: 0.9rem;
      color: #909399;
      margin-bottom: 12px;
    }
  }

  .subscribe-active {
    text-align: center;

    .active-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;

      i {
        font-size: 20px;
        color: #67c23a;
      }

      span {
        font-size: 0.95rem;
        color: #67c23a;
        font-weight: 500;
      }
    }
  }

  .subscribe-idle {
    text-align: center;
  }
}

:deep(.el-dropdown-menu__item) {
  a {
    text-decoration: none;
    color: inherit;
    display: block;
    width: 100%;
    
    &:hover {
      color: inherit;
    }
    
    &:visited {
      color: inherit;
    }
  }
}
</style>
