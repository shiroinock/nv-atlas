import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nvimPlugin } from "./vite-plugin-nvim";

export default defineConfig({
  plugins: [react(), nvimPlugin()],
});
