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
        <!-- 手机号验证码登录表单 -->
        <div v-if="showSmsForm" class="sms-login-form">
          <div class="sms-title">手机号验证码登录</div>
          <el-input
            v-model="phone"
            :maxlength="11"
            placeholder="请输入手机号"
            class="sms-input"
            clearable
          />
          <div class="sms-code-row">
            <el-input
              v-model="smsCode"
              :maxlength="6"
              placeholder="请输入验证码"
              class="sms-code-input"
              clearable
            />
            <el-button
              class="sms-code-btn"
              :disabled="countdown > 0 || !isValidPhone"
              @click="handleSendSms"
            >
              {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
            </el-button>
          </div>
          <el-button
            type="primary"
            class="sms-submit"
            :loading="smsLoginLoading"
            @click="handleSmsLogin"
          >
            登录
          </el-button>
          <div class="sms-back" @click="showSmsForm = false">
            <span class="sms-back-arrow">←</span>
            返回微信登录
          </div>
        </div>

        <!-- 微信登录（扫码 / 网页授权） -->
        <template v-else>
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

          <!-- 手机号验证码登录入口 -->
          <div class="sms-entry" @click="showSmsForm = true">
            <span class="sms-entry-divider"></span>
            手机号验证码登录
            <span class="sms-entry-arrow">›</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import LoginQrCode from '@/shared/components/LoginQrCode.vue'
import { authApi, WECHAT_OAUTH_LOGIN_URL } from '@/shared/api/api'
import { ElMessage } from 'element-plus'
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

    // 手机号验证码登录状态
    const showSmsForm = ref(false)
    const phone = ref('')
    const smsCode = ref('')
    const countdown = ref(0)
    const smsLoginLoading = ref(false)
    const isValidPhone = computed(() => /^1[3-9]\d{9}$/.test(phone.value))
    let countdownTimer = null
    
    // 检查是否已登录，如果已登录则重定向到首页
    onMounted(() => {
      // 重置滚动位置到顶部
      window.scrollTo(0, 0);
      
      if (store.getters.isLoggedIn) {
        router.push('/');
      }
    });

    onBeforeUnmount(() => {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
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
      console.log('[LoginView] ========== 接收到 login-success 事件 ==========');
      console.log('[LoginView] 用户信息:', user);
      
      if (isProcessingLogin.value) {
        console.log('[LoginView] 正在处理登录中，跳过重复处理');
        return;
      }
      
      try {
        isProcessingLogin.value = true;
        console.log('[LoginView] 开始处理登录成功事件');

        // 后端已通过 Set-Cookie 设置 httpOnly cookie
        // 使用 checkCookieAuth 验证登录状态并获取用户信息
        console.log('[LoginView] 调用 checkCookieAuth 验证登录状态...');
        const success = await store.dispatch('checkCookieAuth');
        
        if (success) {
          console.log('[LoginView] ✅ Cookie 认证成功，登录完成');
          setTimeout(() => {
            const redirect = router.currentRoute.value.query.redirect;
            const targetPath = redirect || '/';
            console.log('[LoginView] 准备跳转到:', targetPath);
            router.push(targetPath);
          }, 500);
        } else {
          console.error('[LoginView] ❌ Cookie 认证失败，尝试降级方案');
          // 降级方案：尝试使用旧的方式
          await store.dispatch('login', user);
          await store.dispatch('fetchUserInfo');
          setTimeout(() => {
            const redirect = router.currentRoute.value.query.redirect;
            const targetPath = redirect || '/';
            console.log('[LoginView] 降级方案：准备跳转到:', targetPath);
            router.push(targetPath);
          }, 500);
        }
      } catch (error) {
        console.error('[LoginView] ❌ 处理登录失败:', error);
        ElMessage.error('登录处理失败，请刷新页面重试');
      } finally {
        isProcessingLogin.value = false;
      }
    };

    // 发送短信验证码（60s 倒计时）
    const handleSendSms = async () => {
      if (!isValidPhone.value) {
        ElMessage.warning('请输入正确的手机号');
        return;
      }
      try {
        await authApi.sendSmsCode(phone.value);
        ElMessage.success('验证码已发送');
        countdown.value = 60;
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
          countdown.value -= 1;
          if (countdown.value <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
          }
        }, 1000);
      } catch (error) {
        const msg = error?.response?.data?.message || error?.message || '发送失败，请稍后再试';
        ElMessage.error(msg);
      }
    };

    // 手机号 + 验证码登录
    const handleSmsLogin = async () => {
      if (!isValidPhone.value) {
        ElMessage.warning('请输入正确的手机号');
        return;
      }
      if (!smsCode.value) {
        ElMessage.warning('请输入验证码');
        return;
      }
      if (smsLoginLoading.value) return;
      smsLoginLoading.value = true;
      try {
        await authApi.smsLogin(phone.value, smsCode.value);
        // 后端已通过 Set-Cookie 设置 httpOnly cookie，与扫码登录一致；复用同一登录完成流程
        await handleLoginSuccess({ phone: phone.value });
      } catch (error) {
        const msg = error?.response?.data?.message || error?.message || '登录失败，请重试';
        ElMessage.error(msg);
      } finally {
        smsLoginLoading.value = false;
      }
    };
    
    return {
      isWechat,
      handleWechatOAuthLogin,
      handleLoginSuccess,
      isProcessingLogin,
      showSmsForm,
      phone,
      smsCode,
      countdown,
      smsLoginLoading,
      isValidPhone,
      handleSendSms,
      handleSmsLogin
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
/* 手机号验证码登录样式 */
.sms-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #ebeef5);
  font-size: 14px;
  color: var(--primary-color);
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }

  .sms-entry-arrow {
    font-size: 16px;
    line-height: 1;
  }
}

.sms-login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;

  .sms-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #303133);
    text-align: center;
    margin-bottom: 4px;
  }

  .sms-code-row {
    display: flex;
    align-items: center;
    gap: 12px;

    .sms-code-input {
      flex: 1;
    }
  }

  .sms-submit {
    width: 100%;
    margin-top: 4px;
  }

  .sms-back {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 14px;
    color: var(--text-secondary, #909399);
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }

    .sms-back-arrow {
      font-size: 14px;
      line-height: 1;
    }
  }
}
</style>
