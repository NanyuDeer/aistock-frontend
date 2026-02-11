<template>
  <div class="login-page">
    <div class="login-card">
      <div class="card-header">
        <div class="logo">
          <img src="@/assets/logo.png" alt="股票资讯AI智能分析" />
          <h1>股票资讯AI智能分析</h1>
        </div>
        <div class="welcome-text">
          <p>
            <img src="@/assets/wechat.svg" alt="微信" class="wechat-inline-logo" />
            {{ isWechat ? '欢迎使用，请点击授权登录' : '欢迎使用，请扫码登录' }}
          </p>
        </div>
      </div>
      
      <div class="card-body">
        <!-- 微信浏览器：使用网页授权跳转登录 -->
        <div v-if="isWechat" class="wechat-oauth-login">
          <div class="oauth-icon">
            <img src="@/assets/wechat.svg" alt="微信" class="wechat-big-logo" />
          </div>
          <p class="oauth-hint">点击下方按钮，授权微信登录</p>
          <button class="wechat-login-btn" @click="handleWechatOAuthLogin">
            <img src="@/assets/wechat.svg" alt="" class="btn-icon" />
            微信授权登录
          </button>
        </div>
        <!-- 非微信浏览器：使用扫码登录 -->
        <LoginQrCode v-else @login-success="handleLoginSuccess" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import LoginQrCode from '@/components/LoginQrCode.vue'
import { WECHAT_OAUTH_LOGIN_URL } from '@/services/api'
import 'element-plus/es/components/message/style/css';

export default {
  name: 'LoginView',
  components: {
    LoginQrCode
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const isProcessingLogin = ref(false)

    // 检测是否在微信浏览器中
    const isWechat = ref(/MicroMessenger/i.test(navigator.userAgent))
    
    // 检查是否已登录，如果已登录则重定向到首页
    onMounted(() => {
      // 重置滚动位置到顶部
      window.scrollTo(0, 0);
      
      if (store.getters.isLoggedIn) {
        router.push('/');
      }
    });

    // 微信浏览器内：跳转微信网页授权登录
    const handleWechatOAuthLogin = () => {
      // 使用路由 query 中的 redirect（从需要登录的页面跳过来时会带），否则默认跳首页
      const redirect = router.currentRoute.value.query.redirect || '/';
      const loginUrl = `${WECHAT_OAUTH_LOGIN_URL}?redirect=${encodeURIComponent(redirect)}`;
      console.log('[LoginView] 微信网页授权跳转:', loginUrl);
      window.location.href = loginUrl;
    };
    
    // 扫码登录成功回调（非微信浏览器）
    const handleLoginSuccess = async (user) => {
      if (isProcessingLogin.value) return;
      try {
        isProcessingLogin.value = true;
        console.log('[LoginView] 处理登录成功事件');

        // 后端已通过 Set-Cookie 设置 httpOnly cookie
        // 使用 checkCookieAuth 验证登录状态并获取用户信息
        const success = await store.dispatch('checkCookieAuth');
        
        if (success) {
          console.log('[LoginView] Cookie 认证成功，登录完成');
          setTimeout(() => {
            const redirect = router.currentRoute.value.query.redirect;
            const targetPath = redirect || '/';
            router.push(targetPath);
          }, 500);
        } else {
          console.error('[LoginView] Cookie 认证失败');
          // 降级方案：尝试使用旧的方式
          await store.dispatch('login', user);
          await store.dispatch('fetchUserInfo');
          setTimeout(() => {
            const redirect = router.currentRoute.value.query.redirect;
            const targetPath = redirect || '/';
            router.push(targetPath);
          }, 500);
        }
      } catch (error) {
        console.error('[LoginView] 处理登录失败:', error);
      } finally {
        isProcessingLogin.value = false;
      }
    };
    
    return {
      isWechat,
      handleWechatOAuthLogin,
      handleLoginSuccess,
      isProcessingLogin
    }
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background-color);
  
  .login-card {
    width: 400px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    
    .card-header {
      padding: 20px;
      
      .logo {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        
        img {
          height: 40px;
          margin-right: 10px;
        }
        
        h1 {
          font-size: 1.5rem;
          color: var(--primary-color);
        }
      }
      
      .welcome-text {
        text-align: center;
        margin: 10px 0;
        
        p {
          font-size: 16px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .wechat-inline-logo {
          width: 22px;
          height: 22px;
          vertical-align: middle;
        }
      }
    }
    
    .card-body {
      padding: 20px;
    }
  }
}

/* 微信网页授权登录样式 */
.wechat-oauth-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;

  .oauth-icon {
    margin-bottom: 20px;

    .wechat-big-logo {
      width: 64px;
      height: 64px;
    }
  }

  .oauth-hint {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  .wechat-login-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    max-width: 280px;
    padding: 12px 24px;
    background-color: #07c160;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #06ad56;
    }

    &:active {
      background-color: #059a4c;
    }

    .btn-icon {
      width: 20px;
      height: 20px;
      filter: brightness(10);
    }
  }
}
</style>
