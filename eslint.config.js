// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tsPlugin = Array.isArray(expoConfig)
  ? expoConfig.find(c => c.plugins && c.plugins['@typescript-eslint'])?.plugins['@typescript-eslint']
  : null;

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/**', 'node_modules/**', '.expo/**'],
  },
  ...(tsPlugin ? [{
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        vars: 'all',
        args: 'none',
        ignoreRestSiblings: true,
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  }] : []),
]);

