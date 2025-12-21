/**
 * Button 组件 Stories
 * 
 * 展示按钮组件的各种状态和用法
 */

import React from 'react';

// 简单的 Button 组件示例
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  onClick 
}) => {
  const baseStyles = {
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
  };
  
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    },
    secondary: {
      background: '#f0f0f0',
      color: '#333',
    },
    danger: {
      background: '#ff4757',
      color: 'white',
    },
    ghost: {
      background: 'transparent',
      color: '#667eea',
      border: '1px solid #667eea',
    },
  };
  
  const sizes = {
    small: { padding: '6px 12px', fontSize: '12px' },
    medium: { padding: '10px 20px', fontSize: '14px' },
    large: { padding: '14px 28px', fontSize: '16px' },
  };
  
  return (
    <button
      style={{ ...baseStyles, ...variants[variant], ...sizes[size] }}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Story 元数据
export default {
  title: '组件/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '通用按钮组件，支持多种样式和尺寸。',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: '按钮样式变体',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: '按钮尺寸',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
    onClick: {
      action: 'clicked',
      description: '点击事件',
    },
  },
};

// 基础用法
export const Primary = {
  args: {
    children: '主要按钮',
    variant: 'primary',
  },
};

export const Secondary = {
  args: {
    children: '次要按钮',
    variant: 'secondary',
  },
};

export const Danger = {
  args: {
    children: '危险按钮',
    variant: 'danger',
  },
};

export const Ghost = {
  args: {
    children: '幽灵按钮',
    variant: 'ghost',
  },
};

// 尺寸展示
export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button size="small">小按钮</Button>
      <Button size="medium">中按钮</Button>
      <Button size="large">大按钮</Button>
    </div>
  ),
};

// 禁用状态
export const Disabled = {
  args: {
    children: '禁用按钮',
    disabled: true,
  },
};

// 所有变体
export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button variant="primary">主要</Button>
      <Button variant="secondary">次要</Button>
      <Button variant="danger">危险</Button>
      <Button variant="ghost">幽灵</Button>
    </div>
  ),
};
