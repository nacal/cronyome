import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // テスト名に期待値を入れているので、既定で読める出力にする
    reporters: ["verbose"]
  }
})
