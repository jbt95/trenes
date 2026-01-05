import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: "./",
    include: ["test/**/*.e2e-spec.ts"],
  },
});
