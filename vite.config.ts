import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "popup.html",
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    environmentOptions: {
      jsdom: { url: "https://www.linkedin.com/jobs/view/123456789/" },
    },
  },
});
