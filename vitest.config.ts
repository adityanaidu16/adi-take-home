import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "kit/blocks/graph/live.test.ts"],
  },
});
