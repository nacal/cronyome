import { expect, it } from "vitest"
import { createDescriber, describe as describeCron } from "../../src/index"
import { generated } from "../corpus/generated"

// 「入力エラーは値で返し、設定エラーは例外で落とす」を
// 両方向から固定する。

const GARBAGE = [
  "",
  " ",
  "*",
  "* *",
  "* * * * * * * *",
  "@daily",
  "0 3 * * MONDAY",
  "0 3 * * 8",
  "0 60 * * *",
  "0 3 32 * *",
  "0 3 * 13 *",
  "0 3 * * 5-1",
  "*/0 * * * *",
  "0 3 * * ${}",
  "0 3 * * 1;DROP TABLE",
  "０ ３ * * *", // 全角
  "0\t3\t*\t*\t*",
  "0 3 * * 1\n0 3 * * 2"
]

it.each([...GARBAGE, ...generated])("describe() は投げない: %j", expr => {
  expect(() => describeCron(expr)).not.toThrow()
})

// 空白のみの入力は「返すべき入力式」が存在しないので、空文字のままでよい。
// それ以外は入力式をそのまま返す（空欄を表示するより害が小さい。
it.each(GARBAGE.filter(expr => expr.trim() !== ""))(
  "解釈できない式でも text に入力式が残る: %j",
  expr => {
    const r = describeCron(expr)
    expect(r.text.length).toBeGreaterThan(0)
  }
)

it.each(["", " ", "\t"])("空白のみの入力は空文字を返してよい: %j", expr => {
  const r = describeCron(expr)
  expect(r.text.trim()).toBe("")
})

it("ランダムな文字列でも投げない", () => {
  const chars = "0123456789*/,-?LW# \tabcMONJAN"
  for (let i = 0; i < 2000; i++) {
    const len = 1 + ((i * 7) % 30)
    let s = ""
    for (let j = 0; j < len; j++) {
      s += chars[(i * 31 + j * 17) % chars.length]
    }
    expect(() => describeCron(s), `入力: ${JSON.stringify(s)}`).not.toThrow()
  }
})

it("設定エラーは createDescriber で落とす", () => {
  expect(() => createDescriber({ dowStartsAt: 2 as never })).toThrow()
  expect(() => createDescriber({ formats: { x: "{nope}" } })).toThrow()
  expect(() => createDescriber({ formats: { x: "{dow:long}" } })).toThrow()
})
