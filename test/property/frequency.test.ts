import { expect, describe as group, it } from "vitest"
import { describe as describeCron } from "../../src/index"
import { cases } from "../corpus/cases"
import { generated } from "../corpus/generated"
import {
  annualUpperBound,
  countRunsInYear,
  describerFor
} from "../support/harness"

/** 上限がこれより大きいケースは数えるのが高価なわりに検出力が低いので飛ばす */
const COUNT_CAP = 20_000

// フィールド数はケースごとに違うので、式だけでなく describer も一緒に持ち回る
const targets: { expr: string; fields?: 5 | 6 }[] = [
  ...cases
    .filter(c => !c.tz)
    .map(c =>
      c.fields ? { expr: c.expr, fields: c.fields } : { expr: c.expr }
    ),
  ...generated.map(expr => ({ expr }))
]

group("説明文が示す周期は、実際の実行回数を下回らない", () => {
  it.each(targets)("$expr", ({ expr, fields }) => {
    const r = fields
      ? describerFor({ fields }).describe(expr)
      : describeCron(expr)
    const bound = annualUpperBound(r.short, r.parts)

    if (bound === null || bound > COUNT_CAP) return

    const actual = countRunsInYear(expr, bound, fields)

    expect(
      actual,
      `「${r.short}」は年 ${bound} 回までを意味するが、実際は年 ${actual} 回以上実行される`
    ).toBeLessThanOrEqual(bound)
  })
})

group("退行の見張り", () => {
  it("0 3 * 1 * を「毎年1月」と説明したら落ちる（P-1 の再発防止）", () => {
    const r = describeCron("0 3 * 1 *")
    const actual = countRunsInYear("0 3 * 1 *", 100)

    expect(actual).toBe(31)
    expect(
      annualUpperBound(r.short, r.parts) ?? Number.POSITIVE_INFINITY,
      `「${r.short}」では 1 月中に毎日動くことが伝わらない`
    ).toBeGreaterThanOrEqual(31)
  })
})
