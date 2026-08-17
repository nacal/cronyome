import { expect, describe as group, it } from "vitest"
import type { DescribeResult } from "../../src/index"
import { createDescriber } from "../../src/index"
import { cases } from "../corpus/cases"
import { generated, generatedSixField } from "../corpus/generated"
import { type Segments, segmentsOf } from "../support/harness"

//
// ケースごとに書かないので、コーパスが増えるほど自動的に守備範囲が広がる。

const cron = createDescriber()
const cron6 = createDescriber({ fields: 6 })

const CYCLE_WORD = /毎年|毎月|毎週|毎日|ごと/g
const TIME_CYCLE_WORD = /毎時|毎分|毎秒/g

function countMatches(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0
}

type Invariant = {
  id: string
  name: string
  check: (r: DescribeResult, s: Segments) => boolean
}

const invariants: Invariant[] = [
  {
    id: "I1",
    name: "日付軸の周期語は 1 つまで（複合 OR のときだけ 2 つ）",
    check: (_r, s) => {
      const dateText = [s.scope, s.freq, s.month, s.dom, s.dow].join("")
      // 複合 OR と、「毎月1〜7日の2日ごと」のような入れ子の周期は 2 つ許す
      const limit = s.dow.includes("または") || s.dom.includes("ごと") ? 2 : 1
      return countMatches(dateText, CYCLE_WORD) <= limit
    }
  },
  {
    id: "I1-time",
    name: "時刻軸の周期語は 1 つまで",
    check: (_r, s) => {
      // 「毎時5分の毎秒」の前半は限定句なので、周期語としては数えない
      const cycleText = s.time.replace(/(毎時|毎分|毎秒)[^の]*の/g, "")
      return countMatches(cycleText, TIME_CYCLE_WORD) <= 1
    }
  },
  {
    id: "I5",
    name: "`*` のフィールドに対応するトークンは空",
    check: (r, s) => {
      if (r.parts.dayOfWeek === undefined && s.dow !== "") return false
      if (r.parts.dayOfMonth === undefined && s.dom !== "") return false
      if (r.parts.month === undefined && s.month !== "" && s.scope !== "")
        return false
      return true
    }
  },
  {
    id: "I6",
    name: "{scope} と {month} が同時に非空にならない",
    check: (_r, s) => !(s.scope !== "" && s.month !== "")
  },
  {
    id: "I7",
    name: "日・曜日が `*` のとき、内側の反復単位が語として現れる",
    check: (r, s) => {
      const dayFree =
        r.parts.dayOfMonth === undefined && r.parts.dayOfWeek === undefined
      if (!dayFree) return true
      // 「毎年1月 3:00」のように、1 月中毎日動くのに年 1 回に読める形を禁じる
      const saysYearlyOrMonthly = /毎年|毎月/.test(s.freq)
      return !saysYearlyOrMonthly
    }
  },
  {
    // これまで見つかったバグ 4 件はすべてこの形だった。
    // 周期語を返す分岐が他フィールドの制約を確認せず早期リターンし、説明から消える
    id: "I8",
    name: "制約されているフィールドは説明に必ず現れる",
    check: (r, s) => {
      const text = s.scope + s.freq + s.month + s.dom + s.dow + s.time
      if (r.parts.hour !== undefined && !/時|:/.test(text)) return false
      if (r.parts.dayOfWeek !== undefined && s.dow === "") return false
      if (r.parts.month !== undefined && s.scope === "" && s.month === "")
        return false
      return true
    }
  },
  {
    id: "text-nonempty",
    name: "text が空にならない",
    check: r => r.text.length > 0
  }
]

const corpus = [
  ...new Set([
    ...cases.filter(c => !c.tz && !c.fields).map(c => c.expr),
    ...generated
  ])
]

// 秒つきは describer が別なので、コーパスも分けて持つ
const sixFieldCorpus = [
  ...new Set([
    ...cases.filter(c => !c.tz && c.fields === 6).map(c => c.expr),
    ...generatedSixField
  ])
]

const targets = [
  ...corpus.map(expr => ({ expr, cron })),
  ...sixFieldCorpus.map(expr => ({ expr, cron: cron6 }))
]

// 値集合が違うのに説明が同じなら、どちらかは制約を落としている。
// I8 はフィールドの有無しか見ないので、"3/10" を "*/10" と同じ説明にする類の
// 取りこぼし（起点・範囲の脱落）はこちらで捕まえる
group("I9: 説明が同じなら値集合も同じ", () => {
  it.each([
    { name: "5 フィールド", exprs: corpus, cron },
    { name: "6 フィールド", exprs: sixFieldCorpus, cron: cron6 }
  ])("$name のコーパスで説明が衝突しない", ({ exprs, cron: describer }) => {
    const seen = new Map<string, { expr: string; parts: string }>()
    const collisions: string[] = []

    for (const expr of exprs) {
      const r = describer.describe(expr)
      const parts = JSON.stringify(r.parts)
      const prev = seen.get(r.short)
      if (prev === undefined) seen.set(r.short, { expr, parts })
      else if (prev.parts !== parts) {
        collisions.push(
          `「${r.short}」: ${prev.expr} と ${expr} は実行時刻が違う（${prev.parts} / ${parts}）`
        )
      }
    }

    expect(collisions).toEqual([])
  })
})

group.each(invariants)("$id: $name", inv => {
  it.each(targets)("$expr", ({ expr, cron: describer }) => {
    const result = describer.describe(expr)
    const segments = segmentsOf(describer, expr)

    expect(
      inv.check(result, segments),
      `${inv.id} 違反: "${expr}" → "${result.short}"\nsegments: ${JSON.stringify(segments)}`
    ).toBe(true)
  })
})
