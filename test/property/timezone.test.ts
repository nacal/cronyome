import { Cron } from "croner"
import { expect, describe as group, it } from "vitest"
import type { Parts } from "../../src/index"
import { createDescriber } from "../../src/index"

// タイムゾーン変換は式そのものを書き換える。書き換えた式が元と同じ瞬間に発火しなければ、
// 表示は静かに嘘になる。croner に両方を計算させて突き合わせる。

const jst = createDescriber({
  sourceTimeZone: "UTC",
  timeZone: "Asia/Tokyo"
})

/** parts から cron 式を組み直す。変換後の式が実際に何になったかを見るため */
const rebuild = (p: Parts): string =>
  [
    p.minute?.join(",") ?? "*",
    p.hour?.join(",") ?? "*",
    p.dayOfMonth?.join(",") ?? "*",
    p.month?.join(",") ?? "*",
    p.dayOfWeek?.join(",") ?? "*"
  ].join(" ")

const SHIFTED = [
  "0 3 * * *",
  "0 20 * * *",
  "0 20 * * 1-5",
  "0 20 1 * *",
  "0 20 15 * *",
  "0 20 5-10 * *",
  "0 20 L * *",
  "0 23 1 * 5",
  "* 20 L * 1-5",
  "30 14 1 * *"
]

/** ずらすと元と一致しなくなるので、変換してはいけない式 */
const NOT_SHIFTED = [
  "0 23 31 * *", // 31 日が無い月がある
  "0 20 28 * *", // 平年の 2 月に 29 日が無い
  "0 20 30 * *",
  "0 20 L 1 *", // 月をまたぐのに月の指定がある
  "0 20 */3 * *" // ステップはずらすと別の意味になる
]

const from = new Date("2027-01-01T00:00:00Z")

group("変換した式は元と同じ瞬間に発火する", () => {
  it.each(SHIFTED)("%s", expr => {
    const r = jst.describe(expr)
    expect(r.tzShifted, `${expr} が変換されていない`).toBe(true)

    const shifted = rebuild(r.parts)
    const original = new Cron(expr, { timezone: "UTC" })
      .nextRuns(60, from)
      .map(d => d.toISOString())
    const converted = new Cron(shifted, { timezone: "Asia/Tokyo" })
      .nextRuns(60, from)
      .map(d => d.toISOString())

    expect(converted, `${expr} → ${shifted}`).toEqual(original)
  })
})

group("表現できない式は変換しない", () => {
  it.each(NOT_SHIFTED)("%s", expr => {
    expect(jst.describe(expr).tzShifted).toBe(false)
  })
})
