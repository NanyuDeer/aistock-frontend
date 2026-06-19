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
                <div class="feishu-unbound-info">
                  <span class="feishu-desc">绑定飞书账号后可接收资讯推送</span>
                  <span class="feishu-hint">当前飞书应用为企业自建应用，需先加入企业</span>
                </div>
                <el-button type="primary" size="small" @click="openFeishuBindDialog">
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
              <div class="setting-item">
                <el-switch
                  v-model="pushSettings.stock_push"
                  :loading="settingsLoading"
                  @change="updatePushSettings('stock_push')"
                />
                <div class="setting-info">
                  <strong>自选股异动推送</strong>
                  <span>当自选股出现重大利好/利空时实时推送</span>
                </div>
              </div>
              <div class="setting-item">
                <el-switch
                  v-model="pushSettings.outbreak_push"
                  :loading="settingsLoading"
                  @change="updatePushSettings('outbreak_push')"
                />
                <div class="setting-info">
                  <strong>媒体关注榜推送</strong>
                  <span>每日9:00和17:00推送三重共振信号检测结果</span>
                </div>
              </div>
              <div class="setting-item">
                <el-switch
                  v-model="pushSettings.leader_push"
                  :loading="settingsLoading"
                  @change="updatePushSettings('leader_push')"
                />
                <div class="setting-info">
                  <strong>风口龙头推送</strong>
                  <span>每日8:30推送风口板块及龙头股推荐</span>
                </div>
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

  <!-- 飞书两步绑定弹窗 -->
  <el-dialog
    v-model="feishuBindDialogVisible"
    title="绑定飞书账号"
    width="460px"
    :close-on-click-modal="true"
    class="feishu-bind-dialog"
  >
    <div class="bind-dialog-content">
      <el-steps :active="bindStep" finish-status="success" simple>
        <el-step title="加入企业" />
        <el-step title="授权登录" />
      </el-steps>

      <div v-if="bindStep === 0" class="bind-step">
        <p class="step-title">第一步：加入企业</p>
        <p class="step-desc">
          当前飞书应用为<strong>企业自建应用</strong>，只有企业成员才能授权使用。请先点击下方链接或扫描二维码加入企业。
        </p>

        <div v-if="enterpriseConfig.inviteLink" class="invite-link-box">
          <el-link
            type="primary"
            :href="enterpriseConfig.inviteLink"
            target="_blank"
            :underline="false"
          >
            点击加入企业
          </el-link>
          <el-button type="primary" link size="small" @click="copyInviteLink">
            复制链接
          </el-button>
        </div>

        <div v-if="enterpriseConfig.inviteQrUrl" class="invite-qr-box">
          <p>或扫描下方二维码加入：</p>
          <el-image
            :src="enterpriseConfig.inviteQrUrl"
            :preview-src-list="[enterpriseConfig.inviteQrUrl]"
            fit="contain"
            class="invite-qr"
          />
          <p class="invite-qr-tip">
            使用飞书扫描以上二维码，在加入到企业后，账号登录需要使用aistock组织的账号才可以正确授权
          </p>
        </div>

        <div v-if="!enterpriseConfig.inviteLink && !enterpriseConfig.inviteQrUrl" class="no-config-tip">
          <el-alert
            title="管理员尚未配置企业邀请入口"
            type="warning"
            :closable="false"
            description="请联系管理员将你添加进企业后，再回来完成授权。"
            show-icon
          />
        </div>
      </div>

      <div v-else class="bind-step">
        <p class="step-title">第二步：授权登录</p>
        <p class="step-desc">
          加入企业后，点击下方的"继续授权"按钮，使用飞书账号完成 OAuth 授权。
        </p>
        <el-alert
          title="若尚未加入企业，授权会失败"
          type="info"
          :closable="false"
          show-icon
          class="oauth-alert"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="bindStep === 1" @click="bindStep = 0">上一步</el-button>
        <el-button v-if="bindStep === 0" type="primary" @click="bindStep = 1">
          已加入企业，下一步
        </el-button>
        <el-button v-else type="primary" :loading="oauthLoading" @click="handleFeishuAuth">
          继续授权
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css';
import api from '@/services/api'

export default {
  name: 'ProfileView',
  setup() {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const user = store.state.user
    const favoriteStocks = ref([]) // 自选股列表
    const defaultAvatar = require('@/assets/default-avatar.svg')
    const settingsLoading = ref(false)
    const pushSettings = ref({
      stock_push: false,
      outbreak_push: false,
      leader_push: false
    })

    // 飞书绑定状态
    const feishuLoading = ref(false)
    const feishuStatus = ref('idle') // 'idle' | 'subscribed' | 'unauthorized'
    const feishuName = ref('')
    const feishuUnbinding = ref(false)
    const feishuBindDialogVisible = ref(false)
    const bindStep = ref(0)
    const oauthLoading = ref(false)
    const enterpriseConfig = ref({ inviteLink: '', inviteQrUrl: '' })

    const openFeishuBindDialog = async () => {
      try {
        const { getFeishuEnterpriseConfig } = await import('@/utils/configManager')
        enterpriseConfig.value = await getFeishuEnterpriseConfig()
      } catch (err) {
        console.error('[ProfileView] 获取企业邀请配置失败:', err)
      }
      bindStep.value = 0
      feishuBindDialogVisible.value = true
    }

    const copyInviteLink = async () => {
      if (!enterpriseConfig.value.inviteLink) return
      try {
        await navigator.clipboard.writeText(enterpriseConfig.value.inviteLink)
        ElMessage.success('邀请链接已复制')
      } catch {
        ElMessage.error('复制失败，请手动复制')
      }
    }

    const fetchFeishuStatus = async (retryCount = 0) => {
      feishuLoading.value = true
      try {
        const res = await api.get('/api/users/me/subscription')
        if (res?.data?.status === 'subscribed') {
          feishuStatus.value = 'subscribed'
          feishuName.value = res.data.feishuName || ''
        } else {
          // 首次查询未拿到 subscribed，且还有重试次数，延迟后重试
          if (retryCount < 2 && !res?.data?.feishuName) {
            feishuLoading.value = false  // 重试前结束加载状态，避免UI闪动
            setTimeout(() => fetchFeishuStatus(retryCount + 1), 500)
            return  // 跳过finally
          }
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
      oauthLoading.value = true
      try {
        const { getFeishuAppId } = await import('@/utils/configManager')
        const feishuAppId = await getFeishuAppId()

        if (!feishuAppId) {
          console.error('[ProfileView] 未配置飞书 App ID')
          ElMessage.error('飞书配置未加载，请稍后重试')
          return
        }

        // 回调必须指向后端 API 域名（gupiao-api），而非前端域名（window.location.origin）
        // 否则 Caddy 会把 /api/* 当作静态文件返回 index.html，导致后端 oauthCallback 从未被调用
        const apiBase = process.env.NODE_ENV === 'production' ? 'https://gupiao-api.yaozhineng.com' : ''
        const redirectUri = encodeURIComponent(`${apiBase}/api/auth/feishu/callback`)
        const state = encodeURIComponent('/profile')
        const scope = encodeURIComponent('contact:contact.base:readonly')
        const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${feishuAppId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`
        window.location.href = authUrl
      } catch (err) {
        console.error('[ProfileView] 获取飞书配置失败:', err)
        ElMessage.error('获取飞书配置失败，请检查网络连接后重试')
      } finally {
        oauthLoading.value = false
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
          pushSettings.value.outbreak_push = response.settings.outbreak_push || false;
          pushSettings.value.leader_push = response.settings.leader_push || false;
        } else {
          pushSettings.value.stock_push = false;
          pushSettings.value.outbreak_push = false;
          pushSettings.value.leader_push = false;
        }
      } catch (error) {
        console.error('获取推送设置失败:', error);
        ElMessage.error('获取推送设置失败');
        pushSettings.value.stock_push = false;
        pushSettings.value.outbreak_push = false;
        pushSettings.value.leader_push = false;
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

      // 检测飞书授权回调结果
      if (route.query.feishu_bind === 'success') {
        ElMessage.success('飞书账号绑定成功！')
        router.replace({ path: route.path, query: {} })
        fetchFeishuStatus()
      } else if (route.query.feishu_bind === 'failed') {
        const reasonMap = {
          no_code: '授权被拒绝',
          token_failed: '获取授权令牌失败',
          userinfo_failed: '获取用户信息失败',
          session_expired: '登录已过期，请重新登录',
          not_in_tenant: '你尚未加入企业，请先加入企业后再授权',
          server_error: '服务器错误',
        }
        const reason = route.query.reason || 'unknown'
        ElMessage.error(`飞书绑定失败：${reasonMap[reason] || reason}`)
        router.replace({ path: route.path, query: {} })
      }

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
      feishuBindDialogVisible,
      bindStep,
      oauthLoading,
      enterpriseConfig,
      openFeishuBindDialog,
      copyInviteLink,
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
          flex-direction: column;
          gap: 16px;
        }

        .setting-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;

          .el-switch {
            margin-top: 2px;
            flex-shrink: 0;
          }

          .setting-info {
            display: flex;
            flex-direction: column;
            gap: 4px;

            strong {
              color: #333;
              font-size: 0.95rem;
            }

            span {
              color: #8a8f99;
              font-size: 0.82rem;
              line-height: 1.4;
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

.feishu-unbound-info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .feishu-desc {
    color: #8a8f99;
    font-size: 0.85rem;
  }

  .feishu-hint {
    color: #f56c6c;
    font-size: 0.78rem;
  }
}

.bind-dialog-content {
  .el-steps {
    margin-bottom: 20px;
  }

  .bind-step {
    .step-title {
      font-size: 1rem;
      font-weight: 600;
      color: #333;
      margin: 0 0 10px;
    }

    .step-desc {
      font-size: 0.88rem;
      color: #606266;
      line-height: 1.6;
      margin: 0 0 16px;
    }

    .invite-link-box {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f5f7fa;
      border-radius: 6px;
    }

    .invite-qr-box {
      text-align: center;

      p {
        font-size: 0.85rem;
        color: #606266;
        margin: 0 0 8px;
      }

      .invite-qr {
        width: 180px;
        height: 180px;
        border: 1px solid #ebeef5;
        border-radius: 8px;
        overflow: hidden;
      }

      .invite-qr-tip {
        margin-top: 12px;
        padding: 8px 12px;
        font-size: 0.8rem;
        line-height: 1.5;
        color: #8a8f99;
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        text-align: center;
      }
    }

    .no-config-tip {
      margin-top: 8px;
    }

    .oauth-alert {
      margin-top: 8px;
    }
  }
}
</style>
