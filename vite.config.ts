import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nvimPlugin } from "./vite-plugin-nvim";

export default defineConfig({
  plugins: [react(), nvimPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
