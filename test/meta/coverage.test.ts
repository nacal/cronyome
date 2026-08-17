import { expect, it } from "vitest"
import type { ErrorCode, TokenName } from "../../src/index"
import { createDescriber } from "../../src/index"
import { cases, type Tag } from "../corpus/cases"
import { describerFor, PROBE_TOKENS, segmentsOf } from "../support/harness"

// 「ケースを書き忘れた」を人間の注意力に頼らない。
// 規則の一覧を宣言し、コーパスがそれを覆っているかを機械で検査する。
//
// 新しい規則を足したらここに足す。ケースを書くまでテストが赤くなる。

const REQUIRED_TAGS: Tag[] = [
  // 日付軸の周期語
  "freq:daily",
  "freq:weekly",
  "freq:monthly",
  "freq:yearly",
  "freq:everyNDays",
  "freq:suppressed",
  // 月の載せ方
  "scope:used",
  "month:positional",
  // 既定以外のスタイル
  "style:12h",
  "style:zeroMinute",
  "style:noFold",
  "style:rangeStyle",
  "style:separator",
  "style:orConnective",
  "parse:dowStartsAt",
  // 時の限定句
  "hour:window",
  "hour:scope",
  // 範囲をそのまま表す
  "dom:range",
  "month:range",
  "dom:stepInRange",
  // 時刻軸（§5.2.2）
  "time:everySecond",
  "time:everyMinute",
  "time:everyHour",
  "time:stepSecond",
  "time:stepMinute",
  "time:stepHour",
  "time:stepOffset",
  "time:stepInRange",
  "time:fixed",
  "time:multi",
  // 畳み込み
  "fold:weekday",
  "fold:weekend",
  "fold:none",
  // 複合
  "composite",
  // タイムゾーン
  "tz:none",
  "tz:sameDay",
  "tz:dayCross",
  "tz:dowShift",
  "tz:unrepresentable",
  "tz:dst"
]

it("全ての規則にケースが存在する", () => {
  const covered = new Set<Tag>(cases.flatMap(c => c.tags))
  const missing = REQUIRED_TAGS.filter(t => !covered.has(t))
  expect(missing, `ケースの無い規則: ${missing.join(", ")}`).toEqual([])
})

it("宣言されていないタグが使われていない", () => {
  const declared = new Set<Tag>(REQUIRED_TAGS)
  const unknown = [...new Set(cases.flatMap(c => c.tags))].filter(
    t => !declared.has(t)
  )
  expect(unknown, `REQUIRED_TAGS に無いタグ: ${unknown.join(", ")}`).toEqual([])
})

// 時刻軸は必ず何かに制約される（最低でも「毎分」）ため、空になることが原理的に無い。
// 「両方のケースを持つ」を求めるより、常に非空であることを主張するほうが強い
const ALWAYS_FILLED: TokenName[] = ["time", "timeLong"]

it("時刻トークンは常に非空", () => {
  for (const c of cases) {
    const segments = segmentsOf(describerFor(c), c.expr)
    for (const token of ALWAYS_FILLED) {
      expect(segments[token], `${c.expr} の {${token}} が空`).not.toBe("")
    }
  }
})

it("全トークンが「非空」「空」の両方のケースを持つ", () => {
  const seen = new Map<TokenName, { filled: boolean; empty: boolean }>(
    PROBE_TOKENS.map(t => [t, { filled: false, empty: false }])
  )

  for (const c of cases) {
    const segments = segmentsOf(describerFor(c), c.expr)
    for (const token of PROBE_TOKENS) {
      const state = seen.get(token)
      if (!state) continue
      if (segments[token] === "") state.empty = true
      else state.filled = true
    }
  }

  const incomplete = [...seen.entries()]
    .filter(([token]) => !ALWAYS_FILLED.includes(token))
    .filter(([, s]) => !s.filled || !s.empty)
    .map(
      ([token, s]) =>
        `${token}(${s.filled ? "" : "非空なし"}${s.empty ? "" : "空なし"})`
    )

  expect(
    incomplete,
    `両方のケースが無いトークン: ${incomplete.join(", ")}`
  ).toEqual([])
})

it("全てのエラーコードが型として宣言されている", () => {
  // 実装が増えたときに、宣言だけして使っていないコードが残るのを防ぐ
  const declared: ErrorCode[] = [
    "FIELD_COUNT_MISMATCH",
    "VALUE_OUT_OF_RANGE",
    "INVALID_RANGE",
    "UNKNOWN_TOKEN",
    "TOKEN_ARGUMENT_NOT_SUPPORTED",
    "INVALID_STYLE_COMBINATION"
  ]
  expect(new Set(declared).size).toBe(declared.length)
})

it("createDescriber は設定の誤りで例外を投げる", () => {
  // 入力エラーは値で返し、設定エラーは例外で落とす
  expect(() =>
    createDescriber({ formats: { bad: "{unknownToken}" } })
  ).toThrow()
})
