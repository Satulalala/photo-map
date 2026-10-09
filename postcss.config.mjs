export default ({ env }) => ({
  plugins: {
    autoprefixer: {},
    ...(env === 'production'
      ? {
          cssnano: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
                normalizeWhitespace: true,
                colormin: true,
                minifySelectors: true,
                minifyParams: true,
                mergeLonghand: true,
                mergeRules: true,
                reduceIdents: false, // 避免破坏动画关键帧名称
                discardUnused: true,
              },
            ],
          },
        }
      : {}),
  },
});
