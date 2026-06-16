<template>
  <div class="profile-page">
    <div class="page-container">
      <div class="profile-card">
        <div class="card-header">
          <h2>个人信息</h2>
        </div>
        <div class="card-body">
          <div class="user-info-section">
            <div class="avatar-display">
              <img :src="user?.avatar || defaultAvatar" alt="头像" class="avatar-circle" />
            </div>
            <div class="username-display">
              <span class="username">{{ user?.name || '未设置用户名' }}</span>
            </div>
          </div>

          <el-divider />

          <!-- 飞书账号绑定区域 -->
          <div class="feishu-bind-section">
            <h3>飞书账号</h3>
            <div class="feishu-bind-card">
              <div v-if="feishuLoading" class="feishu-loading">加载中...</div>
              <div v-else-if="feishuStatus === 'subscribed'" class="feishu-bound">
                <div class="feishu-info">
                  <span class="feishu-icon">✓</span>
                  <span class="feishu-name">{{ feishuName || '已绑定' }}</span>
                  <span class="feishu-badge bound">已绑定</span>
                </div>
                <el-button type="danger" size="small" :loading="feishuUnbinding" @click="handleUnbind">
                  解除绑定
                </el-button>
              </div>
              <div v-else class="feishu-unbound">
                <span class="feishu-desc">绑定飞书账号后可接收资讯推送</span>
                <el-button type="primary" size="small" @click="handleFeishuAuth">
                  绑定飞书账号
                </el-button>
              </div>
            </div>
          </div>

          <el-divider />

          <!-- 推送设置区域 -->
          <div class="push-settings-section">
            <h3>推送设置</h3>
            <div class="settings-container">
              <el-switch
                v-model="pushSettings.stock_push"
                active-text="自选股推送"
                :loading="settingsLoading"
                @change="updatePushSettings('stock_push')"
              />
              <el-switch
                v-model="pushSettings.morning_report"
                active-text="早报推送"
                :loading="settingsLoading"
                @change="updatePushSettings('morning_report')"
              />
            </div>
            <div class="push-tags-container">
              <div class="setting-caption">
                <strong>风口爆发推送</strong>
                <span>外部爬虫返回的公告和新闻研判，会按自选股推送开关发送</span>
              </div>
            </div>
          </div>

          <el-divider />
        </div>
        <div class="card-footer">
          <h3>我的自选股</h3>
          <el-table :data="favoriteStocks" border>
            <el-table-column label="股票代码" align="center">
              <template #default="scope">
                <span class="market-code">{{ getMarketCode(scope.row.code) }}</span>
                <span>{{ scope.row.code }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="股票名称" align="center" />
            <el-table-column prop="added_at" label="添加时间" align="center" />
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css';
import api from '@/services/api'

export default {
  name: 'ProfileView',
  setup() {
    const store = useStore()
    const router = useRouter()
    const user = store.state.user
    const favoriteStocks = ref([]) // 自选股列表
    const defaultAvatar = require('@/assets/default-avatar.svg')
    const settingsLoading = ref(false)
    const pushSettings = ref({
      stock_push: false,
      morning_report: false
    })

    // 飞书绑定状态
    const feishuLoading = ref(false)
    const feishuStatus = ref('idle') // 'idle' | 'subscribed' | 'unauthorized'
    const feishuName = ref('')
    const feishuUnbinding = ref(false)

    const fetchFeishuStatus = async () => {
      feishuLoading.value = true
      try {
        const res = await api.get('/api/users/me/subscription')
        if (res?.data?.status === 'subscribed') {
          feishuStatus.value = 'subscribed'
          feishuName.value = res.data.feishuName || ''
        } else {
          feishuStatus.value = 'idle'
          feishuName.value = ''
        }
      } catch {
        feishuStatus.value = 'idle'
        feishuName.value = ''
      } finally {
        feishuLoading.value = false
      }
    }

    const handleFeishuAuth = async () => {
      try {
        const { getFeishuAppId } = await import('@/utils/configManager')
        const feishuAppId = await getFeishuAppId()
        
        if (!feishuAppId) {
          console.error('[ProfileView] 未配置飞书 App ID')
          ElMessage.error('飞书配置未加载，请稍后重试')
          return
        }
        
        const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/feishu/callback`)
        const state = encodeURIComponent('/profile')
        const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${feishuAppId}&redirect_uri=${redirectUri}&state=${state}`
        window.location.href = authUrl
      } catch (err) {
        console.error('[ProfileView] 获取飞书配置失败:', err)
        ElMessage.error('获取飞书配置失败，请检查网络连接后重试')
      }
    }

    const handleUnbind = async () => {
      try {
        await ElMessageBox.confirm('解除绑定后将无法接收飞书推送，确定要解除吗？', '解除绑定', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
      } catch {
        return // 用户取消
      }

      feishuUnbinding.value = true
      try {
        await api.post('/api/users/me/subscription', { action: 'unbind' })
        feishuStatus.value = 'idle'
        feishuName.value = ''
        ElMessage.success('已解除飞书绑定')
      } catch {
        ElMessage.error('解除绑定失败')
      } finally {
        feishuUnbinding.value = false
      }
    }

    const fetchUserData = async () => {
      try {
        const response = await store.dispatch('checkCookieAuth');
        if (response) {
          // 数据已通过 checkCookieAuth 更新到 store 中
          favoriteStocks.value = store.getters.favoriteStocks;
        } else {
          ElMessage.error('获取用户信息失败，请重新登录');
          router.push('/login');
        }
      } catch (error) {
        console.error('获取用户数据失败:', error);
        ElMessage.error('获取用户信息失败');
      }
    };

    const fetchPushSettings = async () => {
      if (!user?.id) return;
      
      settingsLoading.value = true;
      try {
        const response = await store.dispatch('fetchPushSettings', user.id);
        if (response && response.settings) {
          pushSettings.value.stock_push = response.settings.stock_push || false;
          pushSettings.value.morning_report = response.settings.morning_report || false;
        } else {
          // 如果没有设置，使用默认值
          pushSettings.value.stock_push = false;
          pushSettings.value.morning_report = false;
        }
      } catch (error) {
        console.error('获取推送设置失败:', error);
        ElMessage.error('获取推送设置失败');
        // 出错时也使用默认值
        pushSettings.value.stock_push = false;
        pushSettings.value.morning_report = false;
      } finally {
        settingsLoading.value = false;
      }
    };

    const updatePushSettings = async (type) => {
      if (!user?.id) return;
      
      settingsLoading.value = true;
      try {
        const success = await store.dispatch('updatePushSettings', {
          type,
          enabled: !!pushSettings.value[type]
        });
        
        if (success) {
          ElMessage.success('推送设置已更新');
        } else {
          ElMessage.error('更新推送设置失败');
          // 回滚UI状态
          await fetchPushSettings();
        }
      } catch (error) {
        console.error('更新推送设置失败:', error);
        ElMessage.error('更新推送设置失败');
        // 回滚UI状态
        await fetchPushSettings();
      } finally {
        settingsLoading.value = false;
      }
    };

    const getMarketCode = (code) => {
      // 简单的市场代码判断逻辑，可以根据需要扩展
      if (!code) return '';
      if (code.startsWith('0') || code.startsWith('3')) return 'SZ';
      if (code.startsWith('6') || code.startsWith('9')) return 'SH';
      return '';
    };

    onMounted(() => {
      // 重置滚动位置到顶部
      window.scrollTo(0, 0);

      fetchUserData();
      fetchPushSettings();
      fetchFeishuStatus();
    })

    return {
      user,
      favoriteStocks,
      defaultAvatar,
      pushSettings,
      settingsLoading,
      updatePushSettings,
      getMarketCode,
      feishuLoading,
      feishuStatus,
      feishuName,
      feishuUnbinding,
      handleFeishuAuth,
      handleUnbind,
    }
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  padding-top: 80px; /* 增加顶部内边距，避免被导航栏遮挡 */
  min-height: 100vh;
  background-color: var(--background-color);

  .page-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .profile-card {
    width: 100%;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    padding: 20px;

    .card-header {
      text-align: center;
      margin-bottom: 20px;

      h2 {
        font-size: 1.5rem;
        color: var(--primary-color);
      }
    }

    .card-body {
      .user-info-section {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;

        .avatar-display {
          margin-right: 20px;

          .avatar-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 3px solid #e0e0e0;
          }
        }

        .username-display {
          .username {
            font-size: 1.4rem;
            font-weight: bold;
            color: #666;
          }
        }
      }

      .push-settings-section {
        margin-top: 20px;

        h3 {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin-bottom: 15px;
        }

        .settings-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .push-tags-container {
          margin-top: 18px;
          padding: 14px 16px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;

          .setting-caption {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 12px;

            strong {
              color: #333;
              font-size: 0.95rem;
            }

            span {
              color: #8a8f99;
              font-size: 0.85rem;
            }
          }
        }
      }

      .feishu-bind-section {
        margin-top: 20px;

        h3 {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin-bottom: 15px;
        }

        .feishu-bind-card {
          padding: 14px 16px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .feishu-loading {
          color: #8a8f99;
          font-size: 0.85rem;
        }

        .feishu-bound {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .feishu-info {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .feishu-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #dcfce7;
            color: #16a34a;
            font-size: 12px;
            font-weight: bold;
          }

          .feishu-name {
            font-size: 0.95rem;
            color: #333;
            font-weight: 500;
          }

          .feishu-badge {
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 10px;

            &.bound {
              background: #dcfce7;
              color: #16a34a;
            }
          }
        }

        .feishu-unbound {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .feishu-desc {
            color: #8a8f99;
            font-size: 0.85rem;
          }
        }
      }
    }

    .card-footer {
      margin-top: 20px;

      h3 {
        margin-bottom: 10px;
        color: var(--text-secondary);
      }
    }
  }
}

.market-code {
  display: inline-block;
  padding: 2px 6px;
  margin-right: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  color: #1677ff;
  background-color: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 12px;
}
</style>
