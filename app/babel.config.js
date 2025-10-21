// C:\Reclaim\app\babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Path alias: import from "@/..."
      ['module-resolver', {
        alias: { '@': './src' },
      }],
      // If you use Reanimated, this MUST be last. Safe to keep even if unused.
      'react-native-reanimated/plugin',
    ],
  };
};
