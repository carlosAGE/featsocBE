const js = require('@eslint/js');
const globals = require('globals');
const jestPlugin = require('eslint-plugin-jest');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Prefix an intentionally-unused arg/var with _ instead of disabling
      // the rule per-line (e.g. Express error middleware's unused `next`).
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // The codebase already has `eslint-disable-next-line no-console`
      // comments at every deliberate console.log/error call — this rule
      // just makes those comments meaningful instead of dead.
      'no-console': 'warn',
    },
  },
  {
    files: ['tests/**/*.js'],
    plugins: { jest: jestPlugin },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
    },
  },
];
