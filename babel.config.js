module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isProd = api.env('production');
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      'react-native-reanimated/plugin',
      ...(isProd ? [['transform-remove-console', { exclude: [] }]] : []),
    ],
  };
};