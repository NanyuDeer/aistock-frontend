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
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css';

export default {
  name: 'ProfileView',
  setup() {
    const store = useStore()
    const user = store.state.user
    const favoriteStocks = ref([]) // 自选股列表
    const defaultAvatar = require('@/assets/default-avatar.svg')
    const settingsLoading = ref(false)
    const pushSettings = ref({
      stock_push: false,
      morning_report: false
    })

    const fetchFavoriteStocks = () => {
      try {
        favoriteStocks.value = store.getters.favoriteStocks
      } catch (error) {
        console.error('获取自选股失败:', error)
      }
    }

    const fetchPushSettings = async () => {
      if (!user?.id) return;
      
      settingsLoading.value = true;
      try {
        const response = await store.dispatch('fetchPushSettings', user.id);
        if (response && response.settings) {
          pushSettings.value.stock_push = response.settings.stock_push || false;
          pushSettings.value.morning_report = response.settings.morning_report || false;
        }
      } catch (error) {
        console.error('获取推送设置失败:', error);
        ElMessage.error('获取推送设置失败');
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
      
      if (!user) {
        ElMessage.error('请先登录')
      } else {
        fetchFavoriteStocks()
        fetchPushSettings()
      }
    })

    return {
      user,
      favoriteStocks,
      defaultAvatar,
      pushSettings,
      settingsLoading,
      updatePushSettings,
      getMarketCode
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
