import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

const expoWinterImportMetaRegistry = resolve(__dirname, 'vitest/shims/expoWinterImportMetaRegistry.ts');

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'react-native': 'react-native-web',
      'react-native$': 'react-native-web',
      /** Avoid native ExpoUpdates in Vitest (guided dev instrumentation imports `expo-updates`). */
      'expo-updates': resolve(__dirname, 'vitest/shims/expoUpdates.ts'),
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
    // N-0052: the 5s default times out a cold sqlite import on this Windows host.
    // 30s is the harness budget. Assertions and test files stay as they are.
    testTimeout: 30_000,
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

