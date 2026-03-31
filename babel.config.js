module.exports = function (api) {
  api.cache(true);
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