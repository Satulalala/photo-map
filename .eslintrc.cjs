/**
 * ESLint 配置文件
 * 
 * 代码规范检查配置，确保代码质量和一致性
 * 
 * 使用方法：
 * - npm run lint      检查代码
 * - npm run lint:fix  自动修复
 */

module.exports = {
  root: true,
  
  // 运行环境
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  
  // 继承的规则集
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  
  // 解析器配置
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  
  // 插件
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
  ],
  
  // React 版本设置
  settings: {
    react: {
      version: 'detect',
    },
  },
  
  // 全局变量
  globals: {
    // Electron API
    electronAPI: 'readonly',
    // Mapbox
    mapboxgl: 'readonly',
  },
  
  // 自定义规则
  rules: {
    // ========== 错误预防 ==========
    
    // 禁止使用 console（生产环境）
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    
    // 禁止使用 debugger（生产环境）
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    
    // 禁止未使用的变量（忽略以 _ 开头的）
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    
    // 禁止使用 var
    'no-var': 'error',
    
    // 优先使用 const
    'prefer-const': 'warn',
    
    // 禁止重复的 case 标签
    'no-duplicate-case': 'error',
    
    // 禁止空的代码块
    'no-empty': ['error', { allowEmptyCatch: true }],
    
    // 禁止不必要的布尔转换
    'no-extra-boolean-cast': 'error',
    
    // ========== 代码风格 ==========
    
    // 缩进：2 空格
    'indent': ['warn', 2, { SwitchCase: 1 }],
    
    // 引号：单引号
    'quotes': ['warn', 'single', { avoidEscape: true }],
    
    // 分号：不使用
    'semi': ['warn', 'always'],
    
    // 逗号风格：末尾逗号
    'comma-dangle': ['warn', 'only-multiline'],
    
    // 对象花括号间距
    'object-curly-spacing': ['warn', 'always'],
    
    // 数组方括号间距
    'array-bracket-spacing': ['warn', 'never'],
    
    // 箭头函数参数括号
    'arrow-parens': ['warn', 'as-needed'],
    
    // 箭头函数空格
    'arrow-spacing': ['warn', { before: true, after: true }],
    
    // 关键字前后空格
    'keyword-spacing': ['warn', { before: true, after: true }],
    
    // 操作符周围空格
    'space-infix-ops': 'warn',
    
    // 代码块前空格
    'space-before-blocks': 'warn',
    
    // 函数括号前空格
    'space-before-function-paren': ['warn', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always',
    }],
    
    // 最大行长度
    'max-len': ['warn', { 
      code: 120, 
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
    }],
    
    // ========== React 规则 ==========
    
    // 允许不导入 React（React 17+）
    'react/react-in-jsx-scope': 'off',
    
    // prop-types 检查（使用 TypeScript 时可关闭）
    'react/prop-types': 'warn',
    
    // JSX 中使用双引号
    'react/jsx-quotes': 'off',
    
    // JSX 缩进
    'react/jsx-indent': ['warn', 2],
    
    // JSX 属性缩进
    'react/jsx-indent-props': ['warn', 2],
    
    // JSX 标签闭合
    'react/self-closing-comp': 'warn',
    
    // JSX 布尔属性
    'react/jsx-boolean-value': ['warn', 'never'],
    
    // JSX 花括号空格
    'react/jsx-curly-spacing': ['warn', { when: 'never' }],
    
    // JSX 等号周围空格
    'react/jsx-equals-spacing': ['warn', 'never'],
    
    // JSX key 属性
    'react/jsx-key': 'error',
    
    // 禁止在 JSX 中使用 .bind() 和箭头函数（性能考虑）
    'react/jsx-no-bind': ['warn', {
      allowArrowFunctions: true,
      allowFunctions: false,
      allowBind: false,
    }],
    
    // 禁止重复的 props
    'react/jsx-no-duplicate-props': 'error',
    
    // 禁止未定义的组件
    'react/jsx-no-undef': 'error',
    
    // 组件命名：PascalCase
    'react/jsx-pascal-case': 'error',
    
    // ========== React Hooks 规则 ==========
    
    // Hooks 规则
    'react-hooks/rules-of-hooks': 'error',
    
    // Hooks 依赖检查
    'react-hooks/exhaustive-deps': 'warn',
    
    // ========== 无障碍规则 ==========
    
    // 点击事件需要键盘事件
    'jsx-a11y/click-events-have-key-events': 'warn',
    
    // 非交互元素不应有交互处理器
    'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    
    // 静态元素不应有交互处理器
    'jsx-a11y/no-static-element-interactions': 'warn',
    
    // 图片需要 alt 属性
    'jsx-a11y/alt-text': 'warn',
    
    // 锚点需要内容
    'jsx-a11y/anchor-has-content': 'warn',
  },
  
  // 针对特定文件的规则覆盖
  overrides: [
    // TypeScript 文件
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        // TypeScript 特定规则
        '@typescript-eslint/no-unused-vars': ['warn', { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    
    // 测试文件
    {
      files: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    
    // 配置文件
    {
      files: ['*.config.js', '*.config.cjs', '.eslintrc.cjs'],
      env: {
        node: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    
    // Electron 主进程文件
    {
      files: ['main.cjs', 'preload.cjs', 'database.cjs'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
  
  // 忽略的文件
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'dist-web/',
    '*.min.js',
    'public/sw.js',
  ],
};