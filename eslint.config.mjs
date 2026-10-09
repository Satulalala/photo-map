import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL('.', import.meta.url)),
  recommendedConfig: js.configs.recommended,
});

export default [
  { ignores: ['node_modules/**', 'build/**', 'dist*/**', 'public/**', '.cache/**'] },
  { files: ['**/*.{js,jsx,ts,tsx}'] },
  ...compat.extends('./.eslintrc.cjs'),
  {
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    rules: { 'react/prop-types': 'off' },
  },
];
