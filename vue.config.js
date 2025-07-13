const AutoImport = require('unplugin-auto-import/webpack')
const Components = require('unplugin-vue-components/webpack')
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers')

module.exports = {
  lintOnSave: false,
  // 添加publicPath确保资源正确加载
  publicPath: '/',
  // 生产环境下禁用 source map
  productionSourceMap: process.env.NODE_ENV !== 'production',
  // 添加 transpileDependencies 以转译潜在的问题依赖
  transpileDependencies: true,
  
  // CSS 优化
  css: {
    extract: process.env.NODE_ENV === 'production',
    sourceMap: false,
    loaderOptions: {
      sass: {
        additionalData: `@use "@/assets/styles/variables.scss" as *;`
      }
    }
  },
  
  // 禁用HMR/热重载
  chainWebpack: config => {
    config.plugins.delete('hmr');
    
    // 生产环境优化
    if (process.env.NODE_ENV === 'production') {
      // 移除 console 和 debugger
      config.optimization.minimizer('terser').tap(args => {
        args[0].terserOptions.compress.drop_console = true
        args[0].terserOptions.compress.drop_debugger = true
        return args
      })
      
      // Gzip 压缩 - 只在生产环境添加
      try {
        const CompressionWebpackPlugin = require('compression-webpack-plugin')
        config.plugin('compressionPlugin').use(
          new CompressionWebpackPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240,
            minRatio: 0.8
          })
        )
      } catch (e) {
        console.warn('compression-webpack-plugin not found, skipping gzip compression')
      }
    }
    
    // 配置代码分割
    config.optimization.splitChunks({
      chunks: 'all',
      minSize: 20000,
      maxSize: 250000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        elementPlus: {
          test: /[\\/]node_modules[\\/]element-plus[\\/]/,
          name: 'element-plus',
          chunks: 'all',
          priority: 20
        },
        echarts: {
          test: /[\\/]node_modules[\\/]echarts[\\/]/,
          name: 'echarts',
          chunks: 'all',
          priority: 20
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5
        }
      }
    });
    
    // 预加载优化 - 检查插件是否存在再配置
    if (config.plugins.has('preload')) {
      config.plugin('preload').tap(options => {
        options[0] = {
          rel: 'preload',
          include: 'initial',
          fileBlacklist: [/\.map$/, /hot-update\.js$/]
        }
        return options
      })
    }
    
    if (config.plugins.has('prefetch')) {
      config.plugin('prefetch').tap(options => {
        options[0].fileBlacklist = options[0].fileBlacklist || []
        options[0].fileBlacklist.push(/runtime\..*\.js$/)
        return options
      })
    }
  },
  
  configureWebpack: {
    resolve: {
      alias: {
        '@': require('path').resolve(__dirname, 'src')
      }
    },
    optimization: {
      usedExports: true,
      sideEffects: false
    },
    plugins: [
      AutoImport({
        resolvers: [ElementPlusResolver()],
        dts: true
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: true
      })
    ]
  },
  devServer: {
    allowedHosts: 'all',
    // 完全禁用WebSocket服务器
    webSocketServer: false,
    // 关闭热重载和实时刷新
    hot: false,
    liveReload: false,
    // 正确配置client选项
    client: {
      // 使用有效的WebSocketURL配置
      webSocketURL: {
        protocol: 'wss',  // 使用安全WebSocket协议
        hostname: 'localhost',
        port: '0'  // 使用无效端口，确保不会连接
      },
      overlay: {
        warnings: false,
        errors: true
      },
      progress: false,
    },
    proxy: {
      '/api': {
        target: 'https://api.aistocklink.cn',
        changeOrigin: true,
        secure: false,
        headers: {
          Referer: 'https://api.aistocklink.cn'
        },
        onProxyReq(proxyReq, req, res) {
          console.log('代理请求:', req.method, req.url);
        },
        onProxyRes(proxyRes, req, res) {
          console.log('代理响应:', proxyRes.statusCode, req.url);
          const contentType = proxyRes.headers['content-type'] || '';
          console.log('响应内容类型:', contentType);
        }
      }
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      devServer.app.use((req, res, next) => {
        console.log('请求:', req.method, req.url);
        next();
      });

      return middlewares;
    }
  }
}
