import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  root: import.meta.dirname,
  // GitHub Pages はプロジェクトサイト（/cronyome/）配下に置かれるため、相対パスで出す
  base: "./",
  plugins: [tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
})
