import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'react-native': 'react-native-web',
      'react-native$': 'react-native-web',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts?(x)'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});

