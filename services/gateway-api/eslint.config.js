// backend/eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { 
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_' 
      }],
      'no-console': 'off'
    }
  }
];