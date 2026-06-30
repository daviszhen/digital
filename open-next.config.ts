export default {
  default: {
    externals: [
      // drizzle-kit hashed modules (e.g., drizzle-kit-8c53b399dac79e94/api)
      "drizzle-kit-*",
      "drizzle-kit-*/api",
      // PostgreSQL drivers — Workers don't support TCP
      "pg-cloudflare",
      "pg",
      "pg-native",
      // Sharp image processing
      "sharp",
    ],
  },
};
