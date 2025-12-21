/**
 * Storybook 预览配置
 * 
 * 配置全局装饰器、参数和主题
 */

import '../src/index.css';

/** @type { import('@storybook/react').Preview } */
const preview = {
  // 全局参数
  parameters: {
    // 操作面板配置
    actions: { argTypesRegex: '^on[A-Z].*' },
    
    // 控件配置
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    
    // 背景配置
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a2e' },
        { name: 'gray', value: '#f5f5f5' },
      ],
    },
    
    // 视口配置
    viewport: {
      viewports: {
        mobile: {
          name: '手机',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: '平板',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: '桌面',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
    
    // 文档配置
    docs: {
      toc: true,
    },
  },
  
  // 全局装饰器
  decorators: [
    (Story) => (
      <div style={{ padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
  
  // 全局参数类型
  globalTypes: {
    theme: {
      name: '主题',
      description: '全局主题切换',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: '浅色' },
          { value: 'dark', icon: 'moon', title: '深色' },
        ],
        showName: true,
      },
    },
    locale: {
      name: '语言',
      description: '国际化语言',
      defaultValue: 'zh-CN',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'zh-CN', title: '中文' },
          { value: 'en-US', title: 'English' },
        ],
      },
    },
  },
};

export default preview;
