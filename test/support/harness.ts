import { Cron } from "croner"
import type {
  Describer,
  DescriberOptions,
  Parts,
  TokenName
} from "../../src/index"
import { createDescriber } from "../../src/index"
import type { Case } from "../corpus/cases"

/**
 * DST のあるゾーンでは説明が季節に依存する。
 * テストを決定的にするため、基準日時を冬に固定する。
 */
export const REFERENCE_DATE: Date = new Date("2027-01-15T00:00:00Z")

/** 実行回数を数える基準年。Date.now() を使うと年をまたいでテストが壊れる */
export const REFERENCE_YEAR = 2027

export function describerFor(
  c: Pick<Case, "fields" | "tz" | "style" | "dowStartsAt">
): Describer {
  const options: DescriberOptions = {
    ...(c.fields ? { fields: c.fields } : {}),
    ...(c.tz ? { sourceTimeZone: c.tz.from, timeZone: c.tz.to } : {}),
    ...(c.style ? { style: c.style } : {}),
    ...(c.dowStartsAt !== undefined ? { dowStartsAt: c.dowStartsAt } : {}),
    referenceDate: REFERENCE_DATE
  }
  return createDescriber(options)
}

// ---------------------------------------------------------------------------
// セグメントの取り出し
//
// 不変条件（I1〜I7）の検証にはトークンごとの出力が要るが、内部 API を露出させたくない。
// 全トークンを区切り文字で並べたフォーマットを描画させれば、公開 API だけで取り出せる。
// 区切りに使う "|" は後処理で落とされる区切り文字（空白・の・・・、・:）に含まれないため、
// 空トークンの位置がそのまま残る。
// ---------------------------------------------------------------------------

export const PROBE_TOKENS: TokenName[] = [
  "scope",
  "freq",
  "month",
  "dom",
  "dow",
  "dowLong",
  "time",
  "timeLong",
  "hour",
  "minute",
  "second"
]

const PROBE_FORMAT = PROBE_TOKENS.map(t => `{${t}}`).join("|")

export type Segments = Record<TokenName, string>

export function segmentsOf(describer: Describer, expression: string): Segments {
  const parts = describer
    .describe(expression, { format: PROBE_FORMAT })
    .text.split("|")
  const out = {} as Segments
  PROBE_TOKENS.forEach((token, i) => {
    out[token] = parts[i] ?? ""
  })
  return out
}

// ---------------------------------------------------------------------------
// croner との突き合わせ
// ---------------------------------------------------------------------------

/** フィールドの上限。数値起点のステップを範囲へ展開するのに使う */
const FIELD_MAX: Record<5 | 6, number[]> = {
  5: [59, 23, 31, 12, 6],
  6: [59, 59, 23, 31, 12, 6]
}

/**
 * croner は "3/10"（数値起点のステップ）を構文エラーにするが、
 * cronyome は robfig/cron や Quartz と同じく "3-59/10" の略記として解釈する。
 * 突き合わせの前にその形へ展開して、croner に同じ意味を渡す
 */
export function forCroner(expression: string, fields: 5 | 6 = 5): string {
  const maxes = FIELD_MAX[fields]
  return expression
    .trim()
    .split(/\s+/)
    .map((token, i) => {
      const max = maxes[i]
      if (max === undefined) return token
      return token
        .split(",")
        .map(part => part.replace(/^(\d+)\//, `$1-${max}/`))
        .join(",")
    })
    .join(" ")
}

export function nextRuns(expression: string, count: number): Date[] {
  return new Cron(forCroner(expression)).nextRuns(count, REFERENCE_DATE)
}

/**
 * 基準年の実行回数を数える。cap を超えたら数えるのをやめる（毎分の式で数百万回回さないため）。
 * 戻り値が cap を超えているかどうかだけが意味を持つ。
 */
export function countRunsInYear(
  expression: string,
  cap: number,
  fields: 5 | 6 = 5
): number {
  // croner はローカル時刻で評価するので、年の境界もローカル時刻で取る。
  // UTC 境界と混ぜると 9 時間ぶんだけ多く数えて 1 回ずれる
  const startAt = new Date(REFERENCE_YEAR, 0, 1)
  const stopAt = new Date(REFERENCE_YEAR + 1, 0, 1)
  const runs = new Cron(forCroner(expression, fields)).nextRuns(
    cap + 1,
    startAt
  )
  return runs.filter(d => d < stopAt).length
}

// ---------------------------------------------------------------------------
// 説明文が示す「年間の実行回数の上限」
//
// 片側の上限だけを見る。ちょうど一致を求めると畳み込みや限定句で誤検知が出るが、
// 上限違反は必ず嘘なので誤検知が原理的に起きない。
// ---------------------------------------------------------------------------

/** 日付軸の周期語 → 年間の出現回数の上限 */
const DATE_CYCLE_BOUND: ReadonlyArray<readonly [string, number]> = [
  ["毎年", 1],
  ["毎月", 12],
  ["毎週", 53],
  ["毎日", 366]
]

/** 時刻軸の周期語 → 1 日あたりの実行回数の上限 */
const TIME_CYCLE_BOUND: ReadonlyArray<readonly [string, number]> = [
  ["毎時", 24],
  ["毎分", 1440],
  ["毎秒", 86400]
]

function listedCount(values: number[] | undefined): number {
  return values === undefined ? 1 : Math.max(values.length, 1)
}

/**
 * 説明文と parts から、年間の実行回数の上限を求める。
 * 上限を求められない場合（step 表現など）は null を返し、検査を飛ばす。
 */
export function annualUpperBound(text: string, parts: Parts): number | null {
  const matched = DATE_CYCLE_BOUND.filter(([word]) => text.includes(word))
  // 「平日」「土日」は語としては「毎週」を含まないが、周期は週。上限計算では週として数える
  if (/平日|土日/.test(text) && !matched.some(([w]) => w === "毎週")) {
    matched.push(["毎週", 53])
  }
  // 「毎時5分の毎秒」のように語が 2 つ出るときは、細かいほう（毎秒）が周期。
  // 粗いほうを取ると上限を実際より小さく見積もって誤検知になる
  const timeWord = [...TIME_CYCLE_BOUND]
    .reverse()
    .find(([word]) => text.includes(word))

  // 「N分ごと」「N時間ごと」などの step 由来の語は上限が緩く、検査の価値が薄い
  if (/ごと/.test(text)) return null

  // 複合（OR）は 2 つの分岐の和が上限になる。最も粗い語だけを見ると過小評価になる
  const composite = text.includes("または")
  const base = composite
    ? matched.reduce((sum, [, bound]) => sum + bound, 0)
    : (matched[0]?.[1] ?? 366)

  // 日付軸の上限 × 列挙されている値の数
  const dateBound = matched.length
    ? base *
      listedCount(parts.month) *
      listedCount(parts.dayOfMonth) *
      listedCount(parts.dayOfWeek)
    : 366

  // 時刻軸の上限。「毎時」は 1 時間に 1 回とは限らないので、分の個数を掛ける
  const timeBound = timeWord
    ? timeWord[1] *
      (timeWord[0] === "毎時"
        ? listedCount(parts.minute) * listedCount(parts.second)
        : timeWord[0] === "毎分"
          ? listedCount(parts.second)
          : 1)
    : listedCount(parts.hour) *
      listedCount(parts.minute) *
      listedCount(parts.second)

  return dateBound * timeBound
}
