import { expect, describe as group, it } from "vitest"
import { createDescriber } from "../../src/index"

// カスタムフォーマットは公開している機能なので、登録した文言が実際に描画されるかを見る。
// 不正な指定で例外が出ることは meta/coverage が確認している。

const cron = createDescriber({
  formats: {
    notice:
      "[{scope}][{freq}][{month}][{dom}][{dowLong}]の{timeLong}に自動実行されます",
    cell: "[{freq}][{dow}] {time}"
  }
})

group("登録したフォーマット", () => {
  it.each([
    ["0 3 * * 1", "notice", "毎週月曜日の3時00分に自動実行されます"],
    ["0 3 1 * *", "notice", "毎月1日の3時00分に自動実行されます"],
    // 組み込みの long は「毎日」の後の「の」を落とすが、
    // カスタムフォーマットの「の」はリテラルなのでそのまま残る
    ["0 3 * 1 *", "notice", "1月の毎日の3時00分に自動実行されます"],
    ["0 3 * * 1", "cell", "毎週月曜 3:00"]
  ])("%s を %s で描画すると %s", (expr, format, expected) => {
    expect(cron.describe(expr, { format }).text).toBe(expected)
  })
})

group("インラインのフォーマット", () => {
  it.each([
    ["0 3 * * 1", "{dow} {time}", "月曜 3:00"],
    ["0 3 * * 1", "{dowLong}の{timeLong}", "月曜日の3時00分"],
    ["0 3 1 * *", "[{dom}の]{time}", "1日の3:00"],
    // 値の無いトークンは、周りのリテラルごと消える
    ["0 3 * * *", "[{dom}の]{time}", "3:00"],
    ["0 3 * * 1", "{hour}時ちょうど", "3時ちょうど"]
  ])("%s を %s で描画すると %s", (expr, format, expected) => {
    expect(cron.describe(expr, { format }).text).toBe(expected)
  })
})

group("short と long は format を指定しても変わらない", () => {
  it("text だけが差し替わる", () => {
    const r = cron.describe("0 3 * * 1", { format: "notice" })
    expect(r.text).toBe("毎週月曜日の3時00分に自動実行されます")
    expect(r.short).toBe("毎週月曜 3:00")
    expect(r.long).toBe("毎週月曜日の3時00分に実行")
  })
})
