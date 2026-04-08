module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './src/tamagui.config.ts',
          // ビルド時の静的解析を無効化（ESM/CJS 競合回避）
          // 本番ビルド時に有効化するとパフォーマンス最適化が効く
          disableExtraction: true,
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
