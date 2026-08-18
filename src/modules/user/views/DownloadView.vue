<template>
  <div class="download-page">
    <div class="page-container">
      <div class="download-card">
        <!-- 头部：App 图标 + 名称 + 版本 -->
        <div class="app-header">
          <img class="app-icon" src="@/assets/logo.png" alt="洞见 App" />
          <div class="app-info">
            <h1 class="app-name">{{ meta.appName || '洞见' }}</h1>
            <p v-if="meta.versionName" class="app-version">v{{ meta.versionName }}</p>
          </div>
        </div>

        <p class="app-desc">{{ meta.description }}</p>

        <!-- 下载按钮 -->
        <div class="download-actions">
          <a
            v-if="downloadUrl"
            class="download-btn"
            :href="downloadUrl"
            :download="fileName"
          >
            <i class="el-icon-download"></i>
            下载 Android 安装包<template v-if="meta.fileSize && meta.fileSize !== '待发布'">（{{ meta.fileSize }}）</template>
          </a>
          <el-button v-else :loading="loading" class="retry-btn" @click="loadMeta">重新加载</el-button>
        </div>

        <!-- 元信息 -->
        <div v-if="hasMeta" class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">当前版本</span>
            <span class="meta-value">v{{ meta.versionName }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">系统要求</span>
            <span class="meta-value">{{ meta.minSystem || 'Android' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">更新时间</span>
            <span class="meta-value">{{ meta.releaseDate }}</span>
          </div>
        </div>

        <!-- 扫码下载（电脑端转手机） -->
        <div v-if="qrDataUrl" class="qr-section">
          <img class="qr-img" :src="qrDataUrl" alt="扫码下载洞见 App" />
          <p class="qr-tip">手机扫码直达下载页</p>
        </div>

        <!-- 功能特性 -->
        <div v-if="meta.features && meta.features.length" class="features">
          <h3 class="features-title">功能亮点</h3>
          <ul class="features-list">
            <li v-for="(feature, i) in meta.features" :key="i">
              <i class="el-icon-check"></i>
              <span>{{ feature }}</span>
            </li>
          </ul>
        </div>

        <!-- 安装提示 -->
        <div class="tips">
          <p>· 安装包目前仅支持 Android 手机，iOS 版本后续上架 App Store。</p>
          <p>· 安装时若提示"未知来源"，请允许后继续；从微信打开需先"用浏览器打开"再下载。</p>
          <p>· 已安装旧版本时直接覆盖安装即可，自选股与设置数据不会丢失。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'

export default {
  name: 'DownloadView',
  setup() {
    const meta = ref({})
    const loading = ref(false)
    const qrDataUrl = ref('')

    const hasMeta = computed(() => meta.value.versionName != null)

    const downloadUrl = computed(() => {
      return meta.value.downloadUrl ? `/download/${meta.value.downloadUrl}` : ''
    })

    const fileName = computed(() => meta.value.downloadUrl || '')

    const loadMeta = async () => {
      loading.value = true
      try {
        // no-store：每次进页面都拉最新版本信息，发版后无需用户清缓存
        const res = await fetch('/download/version.json', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        meta.value = await res.json()
        generateQr()
      } catch (e) {
        ElMessage.error('版本信息加载失败，请刷新重试')
        meta.value = {}
        qrDataUrl.value = ''
      } finally {
        loading.value = false
      }
    }

    // 二维码内容为当前下载页地址，手机扫码后直达本页下载
    const generateQr = () => {
      const url = `${window.location.origin}/download`
      QRCode.toDataURL(url, {
        width: 160,
        margin: 1,
        color: { dark: '#1f2937', light: '#ffffff' }
      })
        .then((dataUrl) => {
          qrDataUrl.value = dataUrl
        })
        .catch(() => {
          qrDataUrl.value = ''
        })
    }

    onMounted(loadMeta)

    return { meta, hasMeta, downloadUrl, fileName, loading, loadMeta, qrDataUrl }
  }
}
</script>

<style lang="scss" scoped>
.download-page {
  padding: 80px 20px 40px;
}

.download-card {
  max-width: 640px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 40px 36px;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .app-icon {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    object-fit: contain;
  }

  .app-name {
    font-size: 26px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .app-version {
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--text-tertiary);
  }
}

.app-desc {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.download-actions {
  margin-bottom: 24px;

  .download-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--primary-color);
    color: #ffffff;
    text-decoration: none;
    font-size: 16px;
    font-weight: 600;
    padding: 12px 28px;
    border-radius: 24px;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.88;
    }
  }

  .retry-btn {
    min-width: 120px;
  }
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: var(--background-color);
  margin-bottom: 24px;

  .meta-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    .meta-label {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;

  .qr-img {
    width: 170px;
    height: 170px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 6px;
  }

  .qr-tip {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--text-tertiary);
  }
}

.features {
  margin-bottom: 24px;

  .features-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  .features-list {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 8px;

      i {
        color: var(--success-color, #67c23a);
        margin-top: 3px;
      }
    }
  }
}

.tips {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;

  p {
    font-size: 13px;
    color: var(--text-tertiary);
    line-height: 1.8;
    margin: 0;
  }
}

@media (max-width: 576px) {
  .download-card {
    padding: 28px 20px;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
