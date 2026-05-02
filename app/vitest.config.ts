import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

const expoWinterImportMetaRegistry = resolve(__dirname, 'vitest/shims/expoWinterImportMetaRegistry.ts');

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'react-native': 'react-native-web',
      'react-native$': 'react-native-web',
      /** Required when Vitest loads `expo/src/winter/runtime.ts` (relative `./ImportMetaRegistry` missing in some Node resolves). */
      'expo/src/winter/ImportMetaRegistry': expoWinterImportMetaRegistry,
      'expo/src/winter/ImportMetaRegistry.js': expoWinterImportMetaRegistry,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts?(x)'],
    /** Thread pool + serial test files: avoids fork-pool startup flakes on Windows and import-order timeouts when many suites dynamic-import expo-sqlite paths in parallel. */
    pool: 'threads',
    fileParallelism: false,
    coverage: {
      reporter: ['text', 'html'],
    },
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  define: {
    __DEV__: true,
    'process.env.EXPO_OS': JSON.stringify('web'),
  },
});

