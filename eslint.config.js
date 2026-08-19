import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'codes-data.js',
            'node_modules/',
            'playwright-report/',
            'sprites-data.js',
            'src/generated/',
            'test-results/',
        ],
    },
    js.configs.recommended,
    {
        files: ['app.js', 'codes-app.js', 'src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.browser,
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },
    {
        files: ['e2e/**/*.js', 'test/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },
    {
        files: ['*.config.js', 'scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node,
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },
];
