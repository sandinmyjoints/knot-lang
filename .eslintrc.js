module.exports = {
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'prettier'],
  env: {
    node: true,
    es6: true,
  },
  globals: {
    global: true,
    jsdom: true,
    jestExpect: true,
    module: true,
  },
  rules: {
    'no-console': 'off',
  },
};
