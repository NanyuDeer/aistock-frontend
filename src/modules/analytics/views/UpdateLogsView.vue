<template>
  <div class="update-logs-page">
    <div class="page-container">
      <div class="logs-container">
        <div class="page-header">
          <h1>后端更新日志</h1>
          <p class="subtitle">来自 aistock-api-cf 的 GitHub 提交记录</p>
        </div>

        <div class="toolbar">
          <a
            class="repo-link"
            href="https://github.com/fengwm64/aistock-api-cf"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看后端仓库
          </a>
        </div>

        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <div v-else-if="error" class="error-container">
          <i class="el-icon-warning-outline"></i>
          <h3>加载失败</h3>
          <p>{{ error }}</p>
          <el-button type="primary" @click="fetchLogs">重试</el-button>
        </div>

        <div v-else class="logs-list">
          <div v-if="logs.length === 0" class="empty-state">
            <p>暂无后端更新日志</p>
          </div>
          
          <div v-else>
            <div
              v-for="log in logs"
              :key="log.id"
              class="log-item"
            >
              <div class="log-header">
                <div class="log-meta">
                  <span class="log-date">{{ log.created_at }}</span>
                  <span class="log-type type-github">GitHub</span>
                </div>
              </div>

              <div class="commit-content">
                <h3 class="commit-title">{{ log.title }}</h3>
                <div
                  v-if="log.body"
                  class="commit-body"
                  v-html="formatLogMessage(log.body)"
                ></div>
                <div class="commit-meta">
                  <span>作者：{{ log.author }}</span>
                  <a
                    v-if="log.html_url"
                    :href="log.html_url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ log.short_sha || '查看提交' }}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div v-if="pagination.total > 0" class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="pagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'UpdateLogsView',
  setup() {
    const store = useStore();
    const logs = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const pagination = ref({
      total: 0,
      pages: 1,
      has_prev: false,
      has_next: false
    });

    // 获取更新日志
    const fetchLogs = async () => {
      loading.value = true;
      error.value = null;

      try {
        const result = await store.dispatch('fetchGithubCommits', {
          owner: 'fengwm64',
          repo: 'aistock-api-cf',
          page: currentPage.value,
          per_page: pageSize.value
        });

        if (result) {
          logs.value = result.logs;
          pagination.value = result.pagination;
        } else {
          logs.value = [];
          pagination.value = { total: 0, pages: 1, has_prev: false, has_next: false };
        }
      } catch (err) {
        console.error('获取更新日志失败:', err);
        error.value = err.message || '获取更新日志失败';
      } finally {
        loading.value = false;
      }
    };

    const formatLogMessage = (message) => {
      if (!message) return '';
      
      return message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 粗体
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // 斜体
        .replace(/\r?\n/g, '<br>') // 换行
        .replace(/   \* /g, '&nbsp;&nbsp;&nbsp;• ') // 列表项
        .replace(/\* /g, '• '); // 简单列表项
    };

    const handleCurrentChange = (page) => {
      currentPage.value = page;
      fetchLogs();
    };

    const handleSizeChange = (size) => {
      pageSize.value = size;
      currentPage.value = 1;
      fetchLogs();
    };

    onMounted(() => {
      window.scrollTo(0, 0);
      document.title = '后端更新日志 - AI StockLink';
      fetchLogs();
    });

    return {
      logs,
      loading,
      error,
      currentPage,
      pageSize,
      pagination,
      fetchLogs,
      formatLogMessage,
      handleCurrentChange,
      handleSizeChange
    };
  }
};
</script>

<style lang="scss" scoped>
.update-logs-page {
  background-color: var(--background-color);
  min-height: 100vh;
  padding: 20px 0;

  .logs-container {
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    padding: 24px;
    margin-bottom: 20px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color);

    h1 {
      font-size: 28px;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .subtitle {
      color: var(--text-tertiary);
      font-size: 14px;
      margin: 0;
    }
  }

  .toolbar {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 24px;
  }

  .repo-link {
    color: var(--primary-color);
    text-decoration: none;
    font-size: 14px;

    &:hover {
      text-decoration: underline;
    }
  }

  .loading-container {
    padding: 20px 0;
  }

  .error-container {
    text-align: center;
    padding: 40px 0;
    color: var(--text-tertiary);

    i {
      font-size: 40px;
      color: #f56c6c;
      margin-bottom: 15px;
    }

    h3 {
      margin-bottom: 15px;
      font-size: 20px;
      color: var(--text-primary);
    }

    p {
      margin-bottom: 25px;
    }
  }

  .empty-state {
    text-align: center;
    padding: 60px 0;
    color: var(--text-tertiary);
    
    p {
      font-size: 16px;
    }
  }

  .logs-list {
    .log-item {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .log-meta {
          display: flex;
          align-items: center;
          gap: 12px;

          .log-date {
            color: var(--text-tertiary);
            font-size: 14px;
          }

          .log-type {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;

            &.type-frontend {
              background-color: #e6f7ff;
              color: #1890ff;
            }

            &.type-github {
              background-color: #f6f8fa;
              color: #24292f;
            }

            &.type-backend {
              background-color: #f6ffed;
              color: #52c41a;
            }

            &.type-feature {
              background-color: #fff7e6;
              color: #fa8c16;
            }

            &.type-fix {
              background-color: #fff1f0;
              color: #f5222d;
            }

            &.type-optimization {
              background-color: #f9f0ff;
              color: #722ed1;
            }

            &.type-default {
              background-color: #f5f5f5;
              color: #595959;
            }
          }
        }
      }

      .commit-content {
        .commit-title {
          margin: 0 0 8px;
          font-size: 16px;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .commit-body {
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 14px;

          :deep(strong) {
            color: var(--text-primary);
            font-weight: 600;
          }

          :deep(em) {
            font-style: italic;
            color: var(--primary-color);
          }
        }

        .commit-meta {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: var(--text-tertiary);

          a {
            color: var(--primary-color);
            text-decoration: none;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
  }

  .pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }
}
</style>
