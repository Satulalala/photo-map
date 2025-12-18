import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
  const isWeb = process.env.BUILD_TARGET === 'web';
  
  return {
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
    },

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
    rollupOptions: {
      output: {
        // 手动分割 Chunk，优化加载顺序
        manualChunks: {
          // React 核心库单独打包（很少变化，利用缓存）
          'react-vendor': ['react', 'react-dom'],
          // 状态管理和工具库
          'utils-vendor': ['zustand', 'uuid'],
          // 虚拟滚动库
          'virtual-scroll': ['react-window'],
        },
        // 资源文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 生产环境移除 console 和 debugger
    minify: 'esbuild',
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
    include: [
      'react',
      'react-dom',
      'react-window',
      'zustand',
      'uuid',
    ],
    // 排除不需要预构建的依赖
    exclude: [],
    // esbuild 配置
    esbuildOptions: {
      target: 'es2020',
    },
  },

  // CSS 配置
  css: {
    // 开发环境启用 sourcemap
    devSourcemap: true,
  },
  
  // HTML 入口文件
  ...(isWeb && {
    build: {
      ...this.build,
      rollupOptions: {
        ...this.build?.rollupOptions,
        input: path.resolve(__dirname, 'index-web.html'),
      },
    },
  }),
}});
