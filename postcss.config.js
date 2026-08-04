import purgecss from "@fullhuman/postcss-purgecss";

export default {
  plugins: [
    ...(process.env.NODE_ENV === "production"
      ? [
          purgecss({
            content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
            defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
            safelist: {
              standard: [/^leaflet-/, /^recharts-/, /^theme-/],
              deep: [/^leaflet/, /^recharts/],
            },
          }),
        ]
      : []),
  ],
};
