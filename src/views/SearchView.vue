<template>
  <div class="search-page">
    <div class="page-container">
      <div class="search-header">
        <div class="page-title">
          <h1>
            <img src="@/assets/ai-search.png" alt="Logo" class="title-logo" />
            <span class="stock-text">股票搜索</span>
          </h1>
        </div>
        <div class="search-banner">
          <p>🎉 现已支持 <span class="highlight" @click="setKeyword('茅台')">股票名称</span>、<span class="highlight" @click="setKeyword('600519')">股票代码</span>、<span class="highlight" @click="setKeyword('gzmt')">拼音首字母</span> 搜索</p>
        </div>
        
        <div class="search-tabs">
          <div class="tab-buttons">
            <div 
              class="tab-btn" 
              :class="{ active: activeSearchMode === 'text' }"
              @click="activeSearchMode = 'text'"
            >
              <img src="@/assets/search.svg" alt="搜索" class="tab-icon" />
              <span>文字搜索</span>
            </div>
            <div 
              class="tab-btn" 
              :class="{ active: activeSearchMode === 'image' }"
              @click="activeSearchMode = 'image'"
            >
              <img src="@/assets/upload.svg" alt="图片" class="tab-icon" />
              <span>图片识别</span>
            </div>
          </div>
          
          <div class="tab-content">
            <!-- 文字搜索模式 -->
            <div v-show="activeSearchMode === 'text'" class="search-box">
              <el-input
                v-model="keyword"
                placeholder="输入股票代码或名称"
                clearable
                class="search-input"
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <img src="@/assets/search.svg" alt="搜索" class="input-icon" />
                </template>
                <template #append>
                  <el-button :loading="loading" @click="handleSearch">搜索</el-button>
                </template>
              </el-input>
            </div>
            
            <!-- 图片搜索模式 -->
            <div v-show="activeSearchMode === 'image'" class="image-search-box">
              <el-upload
                class="image-uploader"
                action=""
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :on-change="handleImageChange"
              >
                <div class="upload-area">
                  <template v-if="imageFile">
                    <img :src="imagePreview" class="preview-image" />
                    <div class="image-actions">
                      <el-button size="small" type="danger" @click.stop="removeImage">
                        删除图片
                      </el-button>
                      <el-button 
                        size="small" 
                        type="primary" 
                        @click.stop="processImage"
                        :loading="imageUploading"
                      >
                        开始识别
                      </el-button>
                    </div>
                  </template>
                  <div v-else class="upload-placeholder">
                    <img src="@/assets/upload.svg" class="upload-icon" />
                    <p>点击或拖拽图片到此区域</p>
                    <p class="upload-hint">支持识别图片中的股票代码，如截图、照片等</p>
                  </div>
                </div>
              </el-upload>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 图片识别结果弹窗 -->
      <el-dialog
        v-model="imageResultVisible"
        title="图片识别结果"
        width="500px"
      >
        <div v-loading="imageUploading" class="image-result">
          <div v-if="recognizedStocks.length > 0" class="recognized-stocks">
            <p>识别到以下股票：</p>
            <el-table
              :data="recognizedStocks"
              style="width: 100%"
              @selection-change="handleSelectionChange"
            >
              <el-table-column
                type="selection"
                width="55"
              />
              <el-table-column
                prop="code"
                label="股票代码"
                width="120"
              />
              <el-table-column
                prop="name"
                label="股票名称"
              />
            </el-table>
          </div>
          <el-empty v-else description="未识别到股票信息" />
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="imageResultVisible = false">取消</el-button>
            <el-button 
              type="primary" 
              @click="addRecognizedStocks" 
              :disabled="selectedStocks.length === 0"
              :loading="addingStocks"
            >
              添加选中股票
            </el-button>
          </span>
        </template>
      </el-dialog>
      
      <!-- 搜索结果区域 -->
      <div class="search-results" v-loading="loading" element-loading-text="正在加载搜索结果...">
        <!-- 搜索结果信息 -->
        <div v-if="searchPerformed" class="result-info">
          <span v-if="searchResults.length > 0">找到 {{ searchResults.length }} 条结果</span>
        </div>
        
        <!-- 骨架屏 -->
        <div v-if="loading" class="skeleton-container">
          <el-skeleton :rows="3" animated />
          <el-skeleton :rows="3" animated style="margin-top: 20px;" />
        </div>
        
        <!-- 搜索结果列表 -->
        <div v-else class="result-list">
          <div 
            v-for="(stock, index) in searchResults" 
            :key="stock.code" 
            class="result-item"
            :class="{'fade-in': !loading}"
          >
            <div class="stock-info">
                <div class="stock-name-code">
                  <h3>{{ stock.name }}</h3>
                  <span v-if="stock.market" class="market-code">{{ stock.market.toUpperCase() }}</span>
                  <span class="stock-code">{{ stock.code }}</span>
                </div>
            </div>
            <div class="stock-actions">
              <el-button type="primary" size="small" @click="viewStockDetail(stock.code)">
                <img src="@/assets/search.svg" alt="详情" class="button-icon" />
                查看详情
              </el-button>
              <el-button 
                type="success" 
                size="small" 
                @click="addToFavorite(stock)"
                :disabled="isFavorite(stock.code)"
              >
                <img 
                  v-if="!isFavorite(stock.code)" 
                  src="@/assets/follow.svg" 
                  alt="关注" 
                  class="button-icon" 
                />
                {{ isFavorite(stock.code) ? '已关注' : (isLoggedIn ? '关注' : '登录后关注') }}
              </el-button>
            </div>
          </div>
          
          <!-- 无结果提示 -->
          <el-empty 
            v-if="searchPerformed && searchResults.length === 0 && !loading" 
            description="没有找到相关股票"
          >
            <el-button @click="keyword = ''">清空搜索条件</el-button>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import 'element-plus/es/components/message/style/css';

export default {
  name: 'SearchView',
  setup() {
    const store = useStore();
    const router = useRouter();
    
    // 登录状态
    const isLoggedIn = computed(() => store.getters.isLoggedIn);
    
    // 搜索关键字
    const keyword = ref('');
    // 搜索结果
    const searchResults = ref([]);
    // 加载状态
    const loading = ref(false);
    // 是否已执行过搜索
    const searchPerformed = ref(false);
    // 搜索模式 (text/image)
    const activeSearchMode = ref('text');
    
    // 图片识别相关状态
    const imageUploading = ref(false);
    const imageResultVisible = ref(false);
    const recognizedStocks = ref([]);
    const selectedStocks = ref([]);
    const addingStocks = ref(false);
    const imageFile = ref(null);
    const imagePreview = ref('');
    
    // 执行搜索
    const handleSearch = async () => {
      if (!keyword.value.trim()) {
        searchResults.value = [];
        searchPerformed.value = false;
        return;
      }
      try {
        loading.value = true;
        searchPerformed.value = true;
        const results = await store.dispatch('searchStocks', {
          keyword: keyword.value,
          limit: 20
        });
        searchResults.value = results || [];
        loading.value = false;
      } catch (error) {
        loading.value = false;
        searchResults.value = [];
      }
    };

    // 监听输入实时搜索
    watch(keyword, () => {
      handleSearch();
    });

    // 设置搜索关键词
    const setKeyword = (value) => {
      keyword.value = value;
      activeSearchMode.value = 'text'; // 切换到文字搜索模式
    };

    // 查看股票详情
    const viewStockDetail = (code) => {
      router.push(`/stock/${code}`);
    };
    
    // 添加到自选股
    const addToFavorite = async (stock) => {
      if (!store.getters.isLoggedIn) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }
      
      try {
        loading.value = true;
        const result = await store.dispatch('addFavoriteStocks', [{
          code: stock.code,
          name: stock.name
        }]);
        
        if (result) {
          ElMessage.success(`已将 ${stock.name} 添加到自选股`);
        } else {
          ElMessage.error('添加自选股失败');
        }
      } catch (error) {
        console.error('添加自选股失败:', error);
        ElMessage.error('添加自选股失败，请稍后重试');
      } finally {
        loading.value = false;
      }
    };
    
    // 检查股票是否已在自选股中
    const isFavorite = (code) => {
      const favoriteStocks = store.getters.favoriteStocks || [];
      return favoriteStocks.some(stock => stock.code === code);
    };
    
    // 处理图片上传
    const handleImageChange = async (file) => {
      if (!file || !file.raw) {
        console.error('上传文件无效或格式错误');
        ElMessage.error('上传文件无效');
        return;
      }
      
      // 安全地访问file.type属性
      const fileType = file.raw.type || '';
      
      // 验证文件类型
      const isImage = fileType.indexOf('image/') !== -1;
      if (!isImage) {
        ElMessage.error('只能上传图片文件!');
        return;
      }
      
      // 验证文件大小
      const isLt5M = file.raw.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        ElMessage.error('图片大小不能超过5MB!');
        return;
      }
      
      imageFile.value = file.raw;
      
      // 创建预览
      const reader = new FileReader();
      reader.readAsDataURL(file.raw);
      reader.onload = (e) => {
        imagePreview.value = e.target.result;
      };
    };
    
    // 移除已选图片
    const removeImage = () => {
      imageFile.value = null;
      imagePreview.value = '';
    };
    
    // 处理图片识别
    const processImage = async () => {
      if (!store.getters.isLoggedIn) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }
      
      if (!imageFile.value) {
        ElMessage.warning('请先选择图片');
        return;
      }
      
      try {
        imageUploading.value = true;
        imageResultVisible.value = true;
        
        const reader = new FileReader();
        reader.readAsDataURL(imageFile.value);
        reader.onload = async (e) => {
          const base64 = e.target.result.split(',')[1];
          
          const result = await store.dispatch('addStocksFromImage', base64);
          
          if (result && result.stocks) {
            recognizedStocks.value = result.stocks;
            if (recognizedStocks.value.length === 0) {
              ElMessage.info('未从图片中识别到股票信息');
            } else {
              ElMessage.success(`成功识别出${recognizedStocks.value.length}支股票`);
            }
          } else {
            ElMessage.error('识别失败，请重试');
            imageResultVisible.value = false;
          }
          
          imageUploading.value = false;
        };
      } catch (error) {
        console.error('图片识别失败:', error);
        ElMessage.error('图片识别失败，请重试');
        imageUploading.value = false;
      }
    };
    
    // 处理表格选择变化
    const handleSelectionChange = (selection) => {
      selectedStocks.value = selection;
    };
    
    // 添加识别出的股票
    const addRecognizedStocks = async () => {
      if (selectedStocks.value.length === 0) return;
      
      try {
        addingStocks.value = true;
        
        const result = await store.dispatch('addFavoriteStocks', selectedStocks.value);
        
        if (result) {
          ElMessage.success(`成功添加${selectedStocks.value.length}支股票到自选股`);
          imageResultVisible.value = false;
        } else {
          ElMessage.error('添加股票失败');
        }
      } catch (error) {
        console.error('添加股票失败:', error);
        ElMessage.error('添加股票失败，请重试');
      } finally {
        addingStocks.value = false;
      }
    };
    
    onMounted(async () => {
      // 重置滚动位置到顶部
      window.scrollTo(0, 0);
    });
    
    return {
      isLoggedIn,
      keyword,
      searchResults,
      loading,
      searchPerformed,
      activeSearchMode,
      handleSearch,
      setKeyword,
      viewStockDetail,
      addToFavorite,
      isFavorite,
      imageUploading,
      imageResultVisible,
      recognizedStocks,
      selectedStocks,
      addingStocks,
      imageFile,
      imagePreview,
      handleImageChange,
      handleSelectionChange,
      addRecognizedStocks,
      removeImage,
      processImage
    };
  }
};
</script>

<style lang="scss" scoped>
.search-page {
  padding-top: 80px;
  
  .search-header {
    margin-bottom: 30px;
    
    .page-title {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 15px;
      
      h1 {
        margin: 0;
        display: flex;
        align-items: baseline;
        font-size: 2.5rem;
        font-weight: 700;
        
        .title-logo {
          height: 1em;
          width: auto;
          margin-right: 16px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
          vertical-align: baseline;
          
          &:hover {
            transform: scale(1.05);
          }
        }
        
        .stock-text {
          color: var(--text-primary);
          position: relative;
          letter-spacing: 2px;
        }
      }
    }
    
    .search-banner {
      max-width: 700px;
      margin: 0 auto 20px;
      text-align: center;
      padding: 8px 15px;
      background-color: #f0f7ff;
      border-radius: 4px;
      color: #409EFF;
      font-weight: 500;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      line-height: 1.6;
      
      .highlight {
        background-color: #409EFF;
        color: #fff;
        padding: 2px 5px;
        border-radius: 2px;
        font-weight: 600;
        margin: 0 1px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        display: inline-block;
        
        &:hover {
          background-color: #337ecc;
          transform: translateY(-1px);
        }
      }
    }
    
    .search-tabs {
      max-width: 700px;
      margin: 0 auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      background: #fff;
      
      .tab-buttons {
        display: flex;
        border-bottom: 1px solid var(--border-color);
        
        .tab-btn {
          flex: 1;
          padding: 15px;
          text-align: center;
          cursor: pointer;
          transition: background 0.3s;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          
          .tab-icon {
            width: 18px;
            height: 18px;
            margin-right: 8px;
          }
          
          &:hover {
            background: #f9f9f9;
          }
          
          &.active {
            background: #fff;
            color: var(--primary-color);
            font-weight: 500;
            box-shadow: inset 0 -2px 0 var(--primary-color);
          }
        }
      }
      
      .tab-content {
        padding: 20px;
        
        .search-box {
          width: 100%;
          
          .search-input {
            width: 100%;
          }
        }
        
        .image-search-box {
          :deep(.el-upload) {
            display: block !important; /* 覆盖 Element Plus 默认样式 */
            width: 100%;
          }
          
          .image-uploader {
            width: 100%;
            
            .upload-area {
              width: 100%;
              height: 200px;
              border: 2px dashed #dcdfe6;
              border-radius: 8px;
              cursor: pointer;
              position: relative;
              overflow: hidden;
              transition: border-color 0.3s;
              display: flex;
              align-items: center;
              justify-content: center;
              
              &:hover {
                border-color: var(--primary-color);
              }
              
              .preview-image {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }
              
              .image-actions {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.6);
                padding: 10px;
                display: flex;
                justify-content: center;
                gap: 10px;
              }
              
              .upload-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #909399;
                
                .upload-icon {
                  width: 50px;
                  height: 50px;
                  margin-bottom: 10px;
                }
                
                p {
                  margin: 5px 0;
                  text-align: center;
                }
                
                .upload-hint {
                  font-size: 12px;
                  color: #c0c4cc;
                  margin-top: 10px;
                }
              }
            }
          }
        }
      }
    }
  }
  
  .search-results {
    min-height: 200px;
    
    .result-info {
      margin-bottom: 20px;
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .skeleton-container {
      margin-top: 20px;
    }
    
    .result-list {
      .result-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        margin-bottom: 15px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        
        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        
        &.fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        .stock-info {
          .stock-name-code {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            
            h3 {
              margin: 0;
              margin-right: 10px;
              color: var(--primary-color);
            }
            
            .stock-code {
              color: var(--text-tertiary);
              font-size: 0.9rem;
            }
          }
          
          p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 0.9rem;
          }
        }
        
        .stock-actions {
          display: flex;
          gap: 10px;
        }
      }
    }
  }
}

.input-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;
}

.button-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
  vertical-align: middle;
}

.market-code {
  font-size: 0.75rem;
  font-weight: bold;
  color: #1677ff;
  margin-right: 4px;
  padding: 1px 4px;
  border: 1px solid #d6e4ff;
  background-color: #f0f5ff;
  border-radius: 3px;
  display: inline-block;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .search-page {
    .search-header {
      .page-title {
        flex-direction: column;
        
        .title-logo {
          margin-right: 0;
          margin-bottom: 10px;
          height: 1.2em;
          width: auto;
        }
        
        h1 {
          font-size: 2rem;
          text-align: center;
          
          .stock-text {
            display: block;
            text-align: center;
          }
        }
      }
      
      .search-banner {
        padding: 6px 12px;
        font-size: 13px;
        line-height: 2;
        
        .highlight {
          padding: 1px 4px;
          margin: 0;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .search-page {
    .search-header {
      .page-title {
        h1 {
          font-size: 1.8rem;
        }
      }
    }
  }
}
</style>
