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
        <!-- 十倍股评分入口已隐藏（后续可能用趋势股评分替代） -->
        <router-link to="/trend" class="menu-item" @click="closeMobileMenu">趋势股评分</router-link>
        <router-link to="/event" class="menu-item" @click="closeMobileMenu">事件传导</router-link>
        <router-link v-if="isLoggedIn" to="/potential-push-history" class="menu-item" @click="closeMobileMenu">推送历史</router-link>
        <router-link v-if="isLoggedIn" to="/favorites" class="menu-item" @click="closeMobileMenu">我的自选股</router-link>
        <template v-if="isLoggedIn">
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
        <!-- 十倍股评分入口已隐藏（后续可能用趋势股评分替代） -->
        <router-link to="/trend" class="nav-item" @click="closeMobileMenu">趋势股评分</router-link>
        <router-link to="/event" class="nav-item" @click="closeMobileMenu">事件传导</router-link>
        <router-link v-if="isLoggedIn" to="/potential-push-history" class="nav-item" @click="closeMobileMenu">推送历史</router-link>
        <router-link v-if="isLoggedIn" to="/favorites" class="nav-item" @click="closeMobileMenu">我的自选股</router-link>
      </div>
      <div class="user-area">
        <template v-if="isLoggedIn">
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
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import CacheManager from '@/shared/utils/cacheManager'

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

    return {
      isLoggedIn,
      currentUser,
      defaultAvatar,
      handleLogout,
      mobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
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
