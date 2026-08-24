import purgecss from '@fullhuman/postcss-purgecss';
import tailwindcss from '@tailwindcss/postcss';

export default {
  plugins: [
    tailwindcss(),
    process.env.NODE_ENV === 'production'
      ? purgecss({
          content: [
            './index.html',
            './src/**/*.{js,jsx,ts,tsx,html}'
          ],
          defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
          safelist: {
            standard: [
              /^leaflet-/,
              /^react-datepicker/,
              /^recharts/,
              'leaflet-container',
              'leaflet-zoom-animated',
              'leaflet-interactive',
              'leaflet-pane',
              'leaflet-map-pane',
              'leaflet-tile-pane',
              'leaflet-overlay-pane',
              'leaflet-shadow-pane',
              'leaflet-marker-pane',
              'leaflet-tooltip-pane',
              'leaflet-popup-pane',
              'leaflet-tile',
              'leaflet-tile-loaded',
              'leaflet-layer',
              'leaflet-marker-icon',
              'leaflet-marker-shadow',
              'leaflet-control-zoom',
              'leaflet-control',
              'leaflet-bar',
              'loading-spinner',
              'live-dot',
              'active',
              'dark',
              'light',
            ],
            deep: [
              /^leaflet-/,
              /^react-datepicker/,
              /^recharts/
            ]
          }
        })
      : null
  ].filter(Boolean)
};
