<template>
  <div class="wechat-message-page">
    <div class="page-container">
      <div class="message-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="10" animated />
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-container">
          <i class="el-icon-warning-outline"></i>
          <h3>加载失败</h3>
          <p>{{ error }}</p>
          <el-button type="primary" @click="fetchMessageData">重试</el-button>
          <el-button @click="goToHome">返回首页</el-button>
        </div>

        <!-- 内容显示 -->
        <div v-else-if="messageData" class="message-content">
          <div class="message-header">
            <h2>行情速览</h2>
            <div class="message-time">{{ messageData.date }}</div>
          </div>

          <!-- 头条新闻 -->
          <div v-if="messageData.top_news && messageData.top_news.length > 0" class="news-section">
            <h3 class="section-title">头条新闻</h3>
            <div class="news-list">
              <div v-for="news in messageData.top_news" :key="news.id" class="news-card">
                <h4 class="news-title">{{ news.title }}</h4>
                <div class="news-meta">
                  <span class="news-time">{{ formatDate(news.published_at) }}</span>
                  <span
                    :class="['news-evaluation', getEvaluationClass(news.evaluation)]"
                  >{{ news.evaluation }}</span>
                  <span class="news-sector">{{ news.sector }}</span>
                </div>
                <div class="news-content" v-html="formatContent(news.content)"></div>
                <div :class="['news-reason', getReasonClass(news.evaluation)]">
                  <strong>AI分析：</strong>{{ news.reason }}
                </div>
                <div class="news-link">
                  <a :href="news.link" target="_blank" rel="noopener noreferrer">阅读原文</a>
                </div>
              </div>
            </div>
          </div>

          <!-- 港美股新闻 -->
          <div v-if="messageData.hk_us_news && messageData.hk_us_news.length > 0" class="news-section">
            <h3 class="section-title">港美股资讯</h3>
            <div class="news-list">
              <div v-for="news in messageData.hk_us_news" :key="news.id" class="news-card">
                <h4 class="news-title">{{ news.title }}</h4>
                <div class="news-meta">
                  <span class="news-time">{{ formatDate(news.published_at) }}</span>
                  <span
                    :class="['news-evaluation', getEvaluationClass(news.evaluation)]"
                  >{{ news.evaluation }}</span>
                  <span class="news-sector">{{ news.sector }}</span>
                </div>
                <div class="news-content" v-html="formatContent(news.content)"></div>
                <div :class="['news-reason', getReasonClass(news.evaluation)]">
                  <strong>AI分析：</strong>{{ news.reason }}
                </div>
                <div class="news-link">
                  <a :href="news.link" target="_blank" rel="noopener noreferrer">阅读原文</a>
                </div>
              </div>
            </div>
          </div>

          <!-- 利好消息 -->
          <div v-if="messageData.good_news && messageData.good_news.length > 0" class="news-section">
            <h3 class="section-title">利好消息</h3>
            <div class="news-list">
              <div v-for="news in filteredGoodNews" :key="news.news_id" class="news-card">
                <h4 class="news-title">{{ news.content }}</h4>
                <div class="news-meta">
                  <span class="news-time">{{ news.time }}</span>
                  <span
                    :class="['news-evaluation', getEvaluationClass(news.evaluation)]"
                  >{{ news.evaluation }}</span>
                  <span class="news-stocks">{{ news.stock }}</span>
                </div>
                <div :class="['news-reason', getReasonClass(news.evaluation)]">
                  <strong>AI分析：</strong>{{ news.reason }}
                </div>
                <div class="news-link" v-if="news.link">
                  <a :href="news.link" target="_blank" rel="noopener noreferrer">阅读原文</a>
                </div>
              </div>
            </div>
          </div>

          <!-- 利空消息 -->
          <div v-if="messageData.bad_news && messageData.bad_news.length > 0 && hasBadNews" class="news-section">
            <h3 class="section-title">利空消息</h3>
            <div class="news-list">
              <div v-for="news in filteredBadNews" :key="news.news_id" class="news-card">
                <h4 class="news-title">{{ news.content }}</h4>
                <div class="news-meta">
                  <span class="news-time">{{ news.time }}</span>
                  <span
                    :class="['news-evaluation', getEvaluationClass(news.evaluation)]"
                  >{{ news.evaluation }}</span>
                  <span class="news-stocks">{{ news.stock }}</span>
                </div>
                <div :class="['news-reason', getReasonClass(news.evaluation)]">
                  <strong>AI分析：</strong>{{ news.reason }}
                </div>
                <div class="news-link" v-if="news.link">
                  <a :href="news.link" target="_blank" rel="noopener noreferrer">阅读原文</a>
                </div>
              </div>
            </div>
          </div>

          <!-- 如果没有数据 -->
          <div v-if="(!messageData.top_news || messageData.top_news.length === 0) && 
                      (!messageData.hk_us_news || messageData.hk_us_news.length === 0) &&
                      (!messageData.good_news || messageData.good_news.length === 0) &&
                      (!messageData.bad_news || messageData.bad_news.length === 0 || !hasBadNews)" 
               class="empty-state">
            <p>暂无数据</p>
          </div>

          <div class="footer-actions">
            <el-button type="primary" @click="goToHome">返回首页</el-button>
            <el-button @click="copyShareLink">复制分享链接</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';

export default {
  name: 'WechatMessageView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const msgId = ref(route.params.msgid);
    const messageData = ref(null);
    const loading = ref(true);
    const error = ref(null);

    // 参数有效性检查
    const isValidMsgId = computed(() => {
      return msgId.value && typeof msgId.value === 'string' && msgId.value.trim() !== '';
    });

    // 检查是否有真实的利空消息（排除 news_id 为 0 的占位消息）
    const hasBadNews = computed(() => {
      if (!messageData.value || !messageData.value.bad_news) return false;
      return messageData.value.bad_news.some(news => news && news.news_id && news.news_id !== '0');
    });

    // 过滤出有效的利好消息
    const filteredGoodNews = computed(() => {
      if (!messageData.value || !messageData.value.good_news) return [];
      return messageData.value.good_news.filter(news => news && news.news_id);
    });

    // 过滤出有效的利空消息，排除占位消息
    const filteredBadNews = computed(() => {
      if (!messageData.value || !messageData.value.bad_news) return [];
      return messageData.value.bad_news.filter(news => news && news.news_id && news.news_id !== '0');
    });

    // 获取消息数据
    const fetchMessageData = async () => {
      if (!isValidMsgId.value) {
        error.value = '无效的消息ID';
        loading.value = false;
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        console.log(`[DEBUG] 开始获取微信消息数据, msgId: ${msgId.value}`);
        
        // 使用store action来获取数据
        const data = await store.dispatch('fetchWechatMessage', msgId.value);
        console.log(`[DEBUG] 微信消息数据响应:`, data);
        
        if (data) {
          // 确保所有期望的字段都存在，即使为空
          const normalizedData = {
            date: data.date || "",
            top_news: data.top_news || [],
            hk_us_news: data.hk_us_news || [],
            good_news: data.good_news || [],
            bad_news: data.bad_news || []
          };
          
          // 检查是否包含必要的字段 - 支持新旧两种数据格式
          if (normalizedData.date && (
              normalizedData.top_news.length > 0 || 
              normalizedData.hk_us_news.length > 0 || 
              normalizedData.good_news.length > 0 || 
              normalizedData.bad_news.length > 0)) {
            messageData.value = normalizedData;
          } else {
            error.value = '数据格式不正确或不完整';
          }
        } else {
          error.value = '获取数据失败：服务器返回空数据';
        }
      } catch (err) {
        console.error('获取微信消息数据失败:', err);
        
        if (err.response) {
          const status = err.response.status;
          const message = err.response.data?.message || '未知错误';
          error.value = `获取数据失败 (${status}): ${message}`;
        } else if (err.request) {
          error.value = '网络请求失败，请检查您的网络连接';
        } else {
          error.value = `请求出错: ${err.message || '未知错误'}`;
        }
      } finally {
        loading.value = false;
      }
    };

    // 格式化日期
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
        .getDate()
        .toString()
        .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    };

    // 格式化内容，将换行符转换为HTML换行
    const formatContent = (content) => {
      if (!content) return '';
      return content.replace(/\n/g, '<br>');
    };

    // 根据评估结果获取对应的CSS类名
    const getEvaluationClass = (evaluation) => {
      if (!evaluation) return '';
      if (evaluation.includes('利好')) return 'positive';
      if (evaluation.includes('利空')) return 'negative';
      return 'neutral';
    };

    // 根据评估结果获取AI分析背景的CSS类名
    const getReasonClass = (evaluation) => {
      if (!evaluation) return '';
      if (evaluation.includes('利好')) return 'reason-positive';
      if (evaluation.includes('利空')) return 'reason-negative';
      return 'reason-neutral';
    };

    // 返回首页
    const goToHome = () => {
      router.push('/');
    };

    // 复制分享链接
    const copyShareLink = () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(
        () => {
          ElMessage.success('链接已复制到剪贴板');
        },
        () => {
          ElMessage.error('复制失败，请手动复制');
        }
      );
    };

    onMounted(() => {
      document.title = '微信推送消息详情 - AI StockLink';
      if (isValidMsgId.value) {
        fetchMessageData();
      } else {
        error.value = '消息ID不存在或无效';
        loading.value = false;
      }
    });

    return {
      msgId,
      messageData,
      loading,
      error,
      fetchMessageData,
      formatDate,
      formatContent,
      getEvaluationClass,
      getReasonClass,
      goToHome,
      copyShareLink,
      hasBadNews,
      filteredGoodNews,
      filteredBadNews
    };
  }
};
</script>

<style lang="scss" scoped>
.wechat-message-page {
  background-color: var(--background-color);
  min-height: 100vh;

  .message-container {
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    padding: 20px;
    margin-bottom: 20px;
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
      word-break: break-word;
      max-width: 80%;
      margin-left: auto;
      margin-right: auto;
    }

    .el-button {
      margin: 0 10px;
    }
  }

  .message-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color);

    h2 {
      font-size: 24px;
      color: var(--primary-color);
      margin-bottom: 10px;
    }

    .message-time {
      color: var(--text-tertiary);
      font-size: 14px;
    }
  }

  .news-section {
    margin-bottom: 30px;

    .section-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 3px solid var(--primary-color);
    }

    .news-list {
      .news-card {
        background: #f9f9f9;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;

        .news-title {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 10px;
        }

        .news-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 12px;

          .news-time {
            color: var(--text-tertiary);
          }

          .news-evaluation {
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;

            &.positive {
              background-color: #ffecec;
              color: #f56c6c;
            }

            &.negative {
              background-color: #f0f9eb;
              color: #67c23a;
            }

            &.neutral {
              background-color: #f4f4f5;
              color: #909399;
            }
          }

          .news-sector {
            background-color: #ecf5ff;
            color: #409eff;
            padding: 2px 6px;
            border-radius: 3px;
          }

          .news-stocks {
            background-color: #ecf5ff;
            color: #409eff;
            padding: 2px 6px;
            border-radius: 3px;
          }
        }

        .news-content {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-secondary);
          margin-bottom: 10px;
          white-space: pre-line;
        }

        .news-reason {
          padding: 10px;
          border-radius: 5px;
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 10px;
          background-color: #f5f7fa;
          
          strong {
            font-weight: 600;
            color: #909399;
          }
          
          &.reason-positive {
            background-color: #ffecec;
            
            strong {
              color: #f56c6c;
            }
          }
          
          &.reason-negative {
            background-color: #f0f9eb;
            
            strong {
              color: #67c23a;
            }
          }
          
          &.reason-neutral {
            background-color: #f5f7fa;
            
            strong {
              color: #909399;
            }
          }
        }

        .news-link {
          text-align: right;

          a {
            color: var(--primary-color);
            text-decoration: none;
            font-size: 14px;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 40px 0;
    color: var(--text-tertiary);
  }

  .footer-actions {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 30px;
  }
}
</style>
