module.exports = {
    root: true,
    env: {
        node: true,
        es6: true,
        browser: true,
        mocha: true,
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    extends: [
        'eslint:recommended',
        'plugin:vue/vue3-essential',
    ],
    rules: {
        'no-console': 'off',
        'no-debugger': 'warn',
        'no-unused-vars': 'warn',
    },
};

