import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: {
      index: 'src/index.ts',
      cli: 'src/cli.ts',
    },
    format: ['esm', 'cjs'],
    fixedExtension: false,
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    minify: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  fmt: {
    printWidth: 100,
    useTabs: false,
    singleQuote: true,
    jsxSingleQuote: false,
    quoteProps: 'as-needed',
    trailingComma: 'all',
    semi: true,
    arrowParens: 'avoid',
    objectWrap: 'preserve',
    insertFinalNewline: true,
    embeddedLanguageFormatting: 'auto',
    htmlWhitespaceSensitivity: 'css',
    proseWrap: 'preserve',
    sortPackageJson: {
      sortScripts: true,
    },
  },
  run: {
    cache: {
      scripts: true,
      tasks: true,
    },
  },
  staged: {
    '*.{ts,tsx,js,jsx,mjs,cjs,json,md,yml,yaml}': 'vp check --fix',
  },
  lint: {
    categories: {
      correctness: 'warn',
      suspicious: 'warn',
    },
    rules: {
      'react/exhaustive-deps': 'off',
      'typescript/no-explicit-any': 'off',
      'typescript/no-unsafe-type-assertion': 'off',
      'no-shadow': 'off',
      'no-unused-vars': 'off',
    },
    plugins: ['oxc', 'typescript', 'unicorn', 'react'],
    settings: {
      react: {
        linkComponents: [],
        formComponents: [],
        componentWrapperFunctions: [],
      },
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
