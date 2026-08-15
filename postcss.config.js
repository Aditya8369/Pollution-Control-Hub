import purgecss from '@fullhuman/postcss-purgecss';

export default {
  plugins: [
    purgecss({
      content: ['./index.html', './src/**/*.{js,jsx}'],
      safelist: {
        standard: [
          'active',
          'dark',
          'correct',
          'wrong',
          'selected',
          'confidence-high',
          'confidence-low',
        ],
        greedy: [/^leaflet-/],
      },
    }),
  ],
};