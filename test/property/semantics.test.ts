import { expect, describe as group, it } from "vitest"
import { describe as describeCron } from "../../src/index"
import { generated } from "../corpus/generated"
import { nextRuns } from "../support/harness"

// croner が算出した実際の実行時刻と parts が矛盾しないことを確認する。

const SAMPLE = 100

group("parts が実際の実行時刻と矛盾しない", () => {
  it.each(generated)("%s", expr => {
    const { parts } = describeCron(expr)
    const runs = nextRuns(expr, SAMPLE)

    if (parts.minute) {
      expect(runs.every(d => parts.minute?.includes(d.getMinutes()))).toBe(true)
    }
    if (parts.hour) {
      expect(runs.every(d => parts.hour?.includes(d.getHours()))).toBe(true)
    }
    if (parts.month) {
      expect(runs.every(d => parts.month?.includes(d.getMonth() + 1))).toBe(
        true
      )
    }
    // 日と曜日は OR セマンティクスなので、両方あるときは「どちらかを満たす」で判定する
    if (parts.dayOfMonth && parts.dayOfWeek) {
      expect(
        runs.every(
          d =>
            parts.dayOfMonth?.includes(d.getDate()) ||
            parts.dayOfWeek?.includes(d.getDay())
        )
      ).toBe(true)
    } else if (parts.dayOfMonth) {
      expect(runs.every(d => parts.dayOfMonth?.includes(d.getDate()))).toBe(
        true
      )
    } else if (parts.dayOfWeek) {
      expect(runs.every(d => parts.dayOfWeek?.includes(d.getDay()))).toBe(true)
    }
  })
})

group("`*` のフィールドは parts に載らない", () => {
  it.each(["* * * * *", "0 * * * *", "0 3 * * *"])("%s", expr => {
    const { parts } = describeCron(expr)
    const fields = expr.split(" ")

    if (fields[0] === "*") expect(parts.minute).toBeUndefined()
    if (fields[1] === "*") expect(parts.hour).toBeUndefined()
    if (fields[2] === "*") expect(parts.dayOfMonth).toBeUndefined()
    if (fields[3] === "*") expect(parts.month).toBeUndefined()
    if (fields[4] === "*") expect(parts.dayOfWeek).toBeUndefined()
  })
})
