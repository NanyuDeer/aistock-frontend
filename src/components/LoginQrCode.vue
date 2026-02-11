<template>
  <div class="login-qrcode">
    <div class="qrcode-wrapper">
      <div class="qrcode-container">
        <!-- 显示二维码图片 -->
        <div v-if="status === 'pending' && qrImageUrl" class="qrcode-image">
          <img :src="qrImageUrl" alt="请扫描二维码登录" />
        </div>
        <div v-else-if="status === 'confirmed'" class="scan-success">
          <i class="el-icon-check-circle"></i>
          <span>扫码成功</span>
        </div>
        <div v-else-if="status === 'expired'" class="scan-expired">
          <i class="el-icon-refresh"></i>
          <span>二维码已过期</span>
        </div>
        <div v-else class="loading-qrcode">
          <i class="el-icon-loading"></i>
          <span>加载中...</span>
        </div>
      </div>
    </div>
    <div class="qrcode-hint">
      <p v-if="status === 'pending'">使用微信扫一扫登录</p>
      <p v-else-if="status === 'confirmed'">扫码成功，正在登录...</p>
      <p v-else-if="status === 'expired'">二维码已过期，请点击刷新</p>
    </div>
    <div class="status-hint" :class="{ 'status-expired': status === 'expired' }">
      {{ statusMessage }}
    </div>
    <div v-if="status === 'expired'" class="refresh-button">
      <el-button type="primary" @click="refreshQrCode">刷新二维码</el-button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { authApi } from '@/services/api'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'

export default {
  name: 'LoginQrCode',
  props: {
    redirectUrl: {
      type: String,
      default: '/'
    }
  },
  emits: ['login-success'],
  setup(props, { emit }) {
    console.log('[QrCode] 组件初始化开始', props)
    
    const qrSize = ref(200)
    const status = ref('loading') // loading, pending, confirmed, expired
    const countdownTimer = ref(null)
    const pollTimer = ref(null)
    const qrCodeValue = ref('')
    const qrImageUrl = ref('')
    const sessionState = ref('')
    const expiresIn = ref(300) // 二维码有效期，单位秒（5分钟）
    const loading = ref(false)
    const pollCount = ref(0) // 轮询计数器
    const maxPollCount = 150 // 最大轮询次数（2秒 * 150 = 5分钟）
    
    const store = useStore()

    // 监听状态变化
    watch(status, (newVal) => {
      console.log(`[QrCode] 二维码状态变更:`, newVal)
    })
    
    const statusMessage = computed(() => {
      if (status.value === 'expired') {
        return '二维码已失效，点击刷新'
      } else if (status.value === 'confirmed') {
        return '正在登录...'
      } else if (status.value === 'pending') {
        return `二维码有效期 ${expiresIn.value} 秒`
      } else {
        return '正在加载二维码...'
      }
    })
    
    // 获取扫码登录URL并开始轮询
    const fetchQrCodeAndStartPolling = async () => {
      console.log('[QrCode] 开始获取二维码')
      try {
        loading.value = true
        status.value = 'loading'
        
        // 清除之前的定时器
        stopPollingAndCountdown()
        
        console.log('[QrCode] 发送API请求获取扫码登录二维码')
        const response = await authApi.getScanLoginUrl()
        console.log('[QrCode] 获取扫码登录二维码响应:', response)
        
        // 适配新的响应格式：{ code: 200, message: "success", data: { state, qr_url, expire_seconds } }
        if (response.code === 200 && response.data) {
          // 从 data 字段中提取需要的数据
          const { state, qr_url, expire_seconds } = response.data
          
          qrImageUrl.value = qr_url || ''
          sessionState.value = state || ''
          
          // 使用后端返回的有效期
          if (expire_seconds && typeof expire_seconds === 'number') {
            expiresIn.value = expire_seconds
          }
          
          console.log('[QrCode] 成功获取二维码数据:', {
            qrImageUrl: qrImageUrl.value,
            sessionState: sessionState.value,
            expiresIn: expiresIn.value
          })
          
          if (sessionState.value && qrImageUrl.value) {
            // 更新状态为等待扫码
            status.value = 'pending'
            
            // 开始倒计时
            startCountdown()
            
            // 开始轮询检查登录状态
            startPolling()
          } else {
            console.error('[QrCode] 缺少必要的二维码数据')
            ElMessage.error('获取二维码数据不完整，请重试')
            status.value = 'expired'
          }
        } else {
          console.error('[QrCode] API响应错误:', response.code, response.message || '')
          ElMessage.error(`获取二维码失败: ${response.message || '未知错误'}`)
          status.value = 'expired'
        }
      } catch (error) {
        console.error('[QrCode] 获取二维码异常:', error)
        ElMessage.error('获取二维码失败，请重试')
        status.value = 'expired'
      } finally {
        loading.value = false
      }
    }
    
    // 开始轮询检查登录状态
    const startPolling = () => {
      console.log('[QrCode] 开始轮询检查登录状态')
      
      // 清除可能存在的之前的轮询
      if (pollTimer.value) {
        clearInterval(pollTimer.value)
      }
      
      // 重置轮询计数器
      pollCount.value = 0
      
      // 立即执行一次检查
      checkLoginStatus()
      
      // 设置轮询间隔（每2秒检查一次）
      pollTimer.value = setInterval(checkLoginStatus, 2000)
    }
    
    // 检查登录状态
    const checkLoginStatus = async () => {
      if (!sessionState.value || status.value !== 'pending') {
        return;
      }
      
      // 增加轮询计数
      pollCount.value++;
      console.log('[QrCode] 检查登录状态 (第', pollCount.value, '次):', sessionState.value);
      
      // 检查是否超过最大轮询次数
      if (pollCount.value > maxPollCount) {
        console.log('[QrCode] 超过最大轮询次数，二维码已过期');
        status.value = 'expired';
        stopPollingAndCountdown();
        ElMessage.warning('二维码已过期，请刷新');
        return;
      }
      
      try {
        const response = await authApi.checkScanLoginStatus(sessionState.value);
        console.log('[QrCode] 登录状态检查响应:', response);
        
        // 适配新的响应格式：{ code: 200, message: "pending"/"confirmed", data: { status, openid } }
        if (response && response.code === 200) {
          const loginStatus = response.data?.status || response.message || '';
          
          if (loginStatus === 'confirmed') {
            console.log('[QrCode] 扫码登录成功');
            status.value = 'confirmed';
            
            stopPollingAndCountdown();
            
            // token 由后端通过 Set-Cookie 设置，需要从 cookie 中获取
            // 如果后端用的是 httpOnly cookie，前端无法直接访问，会在后续请求中自动带上
            // 这里延迟一下确保 cookie 已设置
            setTimeout(async () => {
              console.log('[QrCode] 登录成功，准备跳转');
              
              // 通知父组件登录成功（传递最小用户信息）
              const user = {
                openid: response.data?.openid || '',
                name: '用户',
                avatar: ''
              };
              
              // 将用户信息存储到 Vuex
              store.commit('setIsLoggedIn', true);
              
              emit('login-success', user);
            }, 500);
          } else if (loginStatus === 'pending') {
            // 继续等待
            console.log('[QrCode] 等待用户扫码...');
          }
        }
      } catch (error) {
        console.error('[QrCode] 检查登录状态异常:', error);
        
        // 如果是 404 错误，说明二维码已过期或无效
        if (error.response && error.response.status === 404) {
          console.log('[QrCode] 二维码已过期或无效');
          status.value = 'expired';
          stopPollingAndCountdown();
          ElMessage.warning('二维码已过期，请刷新');
        }
        // 其他错误继续轮询，不中断
      }
    }
    
    // 停止轮询和倒计时
    const stopPollingAndCountdown = () => {
      // 停止轮询
      if (pollTimer.value) {
        clearInterval(pollTimer.value)
        pollTimer.value = null
      }
      
      // 停止倒计时
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
      }
      
      console.log('[QrCode] 已停止轮询和倒计时')
    }
    
    // 开始倒计时
    const startCountdown = () => {
      console.log('[QrCode] 开始二维码有效期倒计时:', expiresIn.value, '秒')
      clearInterval(countdownTimer.value)
      
      countdownTimer.value = setInterval(() => {
        if (expiresIn.value > 0) {
          expiresIn.value -= 1
          if (expiresIn.value % 10 === 0 || expiresIn.value < 10) {
            console.log('[QrCode] 二维码剩余有效期:', expiresIn.value, '秒')
          }
        } else {
          console.log('[QrCode] 二维码已过期')
          status.value = 'expired'
          stopPollingAndCountdown()
        }
      }, 1000)
    }
    
    // 刷新二维码
    const refreshQrCode = () => {
      console.log('[QrCode] 刷新二维码')
      fetchQrCodeAndStartPolling()
    }
    
    onMounted(() => {
      console.log('[QrCode] 组件已挂载，开始获取二维码')
      fetchQrCodeAndStartPolling()
    })
    
    onBeforeUnmount(() => {
      console.log('[QrCode] 组件即将卸载，清理定时器')
      stopPollingAndCountdown()
    })
    
    return {
      qrSize,
      qrCodeValue,
      qrImageUrl,
      status,
      statusMessage,
      refreshQrCode
    }
  }
}
</script>

<style lang="scss" scoped>
.login-qrcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  
  .qrcode-wrapper {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
    
    .qrcode-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 240px;
      height: 240px;
      
      .qrcode-image {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        
        img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
      }
      
      .scan-success, .scan-expired, .loading-qrcode {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        
        i {
          font-size: 60px;
          margin-bottom: 10px;
        }
      }
      
      .scan-success {
        color: var(--success-color);
      }
      
      .scan-expired {
        color: var(--danger-color);
      }
      
      .loading-qrcode {
        color: var(--primary-color);
      }
    }
  }
  
  .qrcode-hint {
    margin-bottom: 10px;
    font-size: 16px;
    color: var(--text-secondary);
    text-align: center;
  }
  
  .status-hint {
    margin-bottom: 20px;
    font-size: 14px;
    color: var(--text-tertiary);
    
    &.status-expired {
      color: var(--danger-color);
    }
  }
  
  .refresh-button {
    margin-bottom: 20px;
  }
}
</style>
