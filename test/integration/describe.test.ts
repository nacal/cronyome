import { expect, describe as group, it } from "vitest"
import { cases } from "../corpus/cases"
import { describerFor } from "../support/harness"

// テスト名に期待値そのものを入れているので、--reporter=verbose の出力が仕様書として読める。
// スナップショットを使わないのは、文言そのものが仕様であり、-u で無自覚に通したくないため。

group.each(cases)("$expr", c => {
  const cron = describerFor(c)
  const result = cron.describe(c.expr)

  it(`short → ${c.short}`, () => {
    expect(result.short).toBe(c.short)
  })

  it(`long  → ${c.long}`, () => {
    expect(result.long).toBe(c.long)
  })

  it("エラーが出ない", () => {
    expect(result.errors).toEqual([])
  })
})
