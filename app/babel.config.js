// C:\Reclaim\app\babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Path alias: import from "@/..."
      [
        'module-resolver',
        {
          alias: { '@': './src' },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
