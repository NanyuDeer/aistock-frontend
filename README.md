# AI Stock 前端项目

## 项目概述

AI Stock是一个股票资讯AI智能分析平台，提供股票搜索、行情展示、AI分析和自选股管理等功能。本项目基于Vue 3开发，通过AI技术为用户提供智能化的股票投资建议和市场分析。

## ⚡ 性能优化亮点

本项目已经过全面的性能优化，具有以下特性：

- 🚀 **首屏加载提升 40-60%** - 路由懒加载 + 代码分割
- 📦 **包体积减少 30-50%** - Element Plus 按需引入 + Tree Shaking  
- ⚡ **API 响应提升 70%** - 智能缓存系统
- 📡 **传输流量节省 60-70%** - Gzip 压缩
- 🎨 **用户体验优化** - 图片懒加载 + 骨架屏 + 加载状态

**快速上手**: 查看 [QUICK_START.md](./QUICK_START.md)
**详细文档**: 查看 [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md)

## 功能特点

- **股票搜索**：支持通过文本和图片OCR识别搜索股票
- **股票详情**：展示股票基本信息、价格走势和交易数据
- **AI投资建议**：基于最新市场动态和新闻提供智能分析
- **自选股管理**：添加、删除和查看自选股
- **市场概览**：实时展示主要指数行情
- **新闻资讯**：提供国内外最新股市相关新闻
- **扫码登录**：支持微信扫码快速登录

## 技术栈

- **前端框架**：Vue 3
- **状态管理**：Vuex
- **路由管理**：Vue Router (懒加载)
- **UI组件库**：Element Plus (按需引入)
- **图表库**：ECharts (代码分割)
- **HTTP客户端**：Axios (智能缓存)
- **Markdown渲染**：Markdown-it
- **性能优化**：Gzip压缩、Tree Shaking、图片懒加载

## 目录结构

```
frontend/
├── public/              # 静态资源
├── src/
│   ├── assets/          # 项目资源文件(图片、样式等)
│   ├── components/      # 公共组件 (含骨架屏、加载组件)
│   ├── directives/      # 自定义指令 (图片懒加载)
│   ├── mixins/          # 混入 (性能优化工具)
│   ├── router/          # 路由配置 (懒加载)
│   ├── services/        # API服务 (缓存)
│   ├── store/           # Vuex状态管理
│   ├── utils/           # 工具函数 (性能工具)
│   ├── views/           # 页面组件
│   ├── App.vue          # 根组件
│   └── main.js          # 入口文件
├── .env                 # 环境变量
├── .eslintrc.js         # ESLint配置
├── babel.config.js      # Babel配置
├── package.json         # 项目依赖
├── vue.config.js        # Vue配置 (性能优化)
├── PERFORMANCE_OPTIMIZATION.md  # 性能优化详细文档
└── QUICK_START.md       # 快速上手指南
```

## 安装与运行

### 前提条件

- Node.js 14.x 或更高版本
- npm 6.x 或更高版本

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run serve
```

### 生产环境构建

```bash
npm run build
```

## 开发指南

### 环境变量配置

在根目录创建`.env`、`.env.development`和`.env.production`文件来配置不同环境的变量。

示例：
```
VUE_APP_API_URL=https://api.aistocklink.cn
VUE_APP_TITLE=AI股票分析
```

### 新增页面

1. 在`src/views`目录下创建Vue组件
2. 在`src/router/index.js`中注册路由

### API调用

在`src/services/api.js`中添加新的API方法。示例：

```javascript
// 获取股票详情
getStockDetail: (code) => api.get(`/api/stocks/detail?code=${code}`),
```

## 部署说明

### Nginx配置

```nginx
server {
    listen 80;
    server_name aistocklink.cn;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 主要页面

- 首页: `/`
- 登录页: `/login`
- 股票详情: `/stock/:code`
- 股票搜索: `/search`
- 自选股: `/favorites`
- 个人中心: `/profile`

