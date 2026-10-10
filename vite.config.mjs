import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
  const isWeb = process.env.BUILD_TARGET === 'web';

  const config = {
    plugins: [
      react(),
      // 构建分析：生成 stats.html 可视化报告
      mode === 'analyze' &&
        visualizer({
          filename: isWeb ? 'dist-web/stats.html' : 'build/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),

    // 开发服务器配置
    server: {
      port: isWeb ? 3001 : 3000,
      strictPort: true,
      host: true,
      // HMR 配置
      hmr: {
        overlay: true,
      },
      // 监听文件变化
      watch: {
        usePolling: false,
      },
    },

    // 缓存配置
    cacheDir: 'node_modules/.vite',

    // 构建配置
    build: {
      outDir: isWeb ? 'dist-web' : 'build',
      emptyOutDir: true,
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 资源内联阈值（小于 4KB 的资源内联为 base64）
      assetsInlineLimit: 4096,
      // Chunk 大小警告阈值
      chunkSizeWarningLimit: 500,
      rolldownOptions: {
        output: {
          // 手动分割 Chunk，优化加载顺序
          codeSplitting: {
            groups: [
              { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'utils-vendor', test: /node_modules[\\/](zustand|uuid)[\\/]/ },
              { name: 'virtual-scroll', test: /node_modules[\\/]react-window[\\/]/ },
            ],
          },
          // 资源文件命名
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      // 使用 Vite 8 默认 Oxc 压缩器
      minify: true,
      target: 'es2020',
    },

    // 路径别名
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@store': path.resolve(__dirname, './src/store'),
        '@types': path.resolve(__dirname, './src/types'),
      },
    },

    // 基础路径
    base: isWeb ? '/' : './',

    // 环境变量定义
    define: {
      __IS_WEB__: isWeb,
      __IS_ELECTRON__: !isWeb,
    },

    // 依赖预构建优化
    optimizeDeps: {
      // 强制预构建的依赖（加速冷启动）
      include: ['react', 'react-dom', 'react-window', 'zustand', 'uuid'],
      // 排除不需要预构建的依赖
      exclude: [],
      // Rolldown 预构建配置
      rolldownOptions: {
        transform: { target: 'es2020' },
      },
    },

    // CSS 配置
    css: {
      // 开发环境启用 sourcemap
      devSourcemap: true,
    },
  };

  // Web 版本特殊配置
  if (isWeb) {
    config.root = __dirname;

    // 添加插件来重写 index.html 请求到 index-web.html
    config.plugins.push({
      name: 'html-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // 将根路径和 index.html 重定向到 index-web.html
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/index-web.html';
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') req.url = '/index-web.html';
          next();
        });
      },
    });

    if (command === 'build') {
      config.build.rolldownOptions.input = path.resolve(__dirname, 'index-web.html');
    } else {
      config.server = {
        ...config.server,
        open: '/index-web.html',
        proxy: {
          '/api': {
            target: 'http://localhost:8080',
            changeOrigin: true,
          },
        },
      };
    }
  }

  return config;
});
