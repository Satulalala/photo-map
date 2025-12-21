/**
 * Storybook 主配置
 * 
 * 配置 Storybook 的核心功能和插件
 */

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  // Stories 文件位置
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  
  // 插件配置
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  
  // 使用 Vite 构建
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  
  // 文档配置
  docs: {
    autodocs: 'tag',
  },
  
  // Vite 配置覆盖
  viteFinal: async (config) => {
    // 添加路径别名
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '/src',
      '@components': '/src/components',
      '@utils': '/src/utils',
      '@store': '/src/store',
      '@types': '/src/types',
      '@api': '/src/api',
      '@mocks': '/src/mocks',
    };
    
    return config;
  },
};

export default config;
