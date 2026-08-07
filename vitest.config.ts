import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Standalone from vite.config.ts on purpose: that file is wrapped by
// @lovable.dev/vite-tanstack-config, which isn't meant to also carry a
// test runner config. This just needs the same @/* path alias.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
