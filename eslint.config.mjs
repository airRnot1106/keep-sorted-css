import antfu from '@antfu/eslint-config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import oxlint from 'eslint-plugin-oxlint';

export default antfu({
  type: 'lib',
  gitignore: true,
  stylistic: false,

  typescript: true,
}).append(
  {
    rules: {
      'perfectionist/sort-imports': 'off',
    },
  },
  eslintConfigPrettier,
  ...oxlint.buildFromOxlintConfigFile('.oxlintrc.json'),
);
