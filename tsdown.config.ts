import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts", "src/internal.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  // 実行時依存はゼロ。外部依存を拾ってしまったら気付けるようにする
  external: []
})
