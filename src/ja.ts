import type { Frequency, Parts, Style, TokenName } from "./index"
import type { Field, FieldTerm, Schedule } from "./internal"

const DOW_SHORT = ["日", "月", "火", "水", "木", "金", "土"]
const DOW_LONG = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日"
]
const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKEND = [0, 6]

/** rangeStyle だけは「未設定」を保つ。未設定なら short と long がそれぞれの既定を使う */
export type ResolvedStyle = Required<Omit<Style, "rangeStyle">> &
  Pick<Style, "rangeStyle">

/** 範囲を「から〜まで」で書くか。未設定なら long のときだけ「から〜まで」 */
function useKara(style: ResolvedStyle, long: boolean): boolean {
  return style.rangeStyle === undefined ? long : style.rangeStyle === "kara"
}

export const DEFAULT_STYLE: ResolvedStyle = {
  hourFormat: "24h",
  zeroMinute: "keep",
  foldWeekdays: true,
  listSeparator: "・",
  valueSeparator: ", ",
  longSeparator: "と",
  orConnective: "または"
}

export type Segments = Record<TokenName, string>

export type BuildResult = {
  segments: Segments
  frequency: Frequency
  parts: Parts
  /** long の連結が「に」を取らない形（毎分・毎秒）か */
  bareCycleTime: boolean
}

const sorted = (f: Field): number[] => [...f.values].sort((a, b) => a - b)

const stepOf = (f: Field): number | null => {
  const term = f.terms.length === 1 ? f.terms[0] : undefined
  return term?.kind === "step" ? term.step : null
}

const specialTerms = (f: Field): FieldTerm[] =>
  f.terms.filter(
    t => t.kind === "lastDay" || t.kind === "nth" || t.kind === "lastDow"
  )

const sameSet = (f: Field, expected: number[]): boolean =>
  f.values.size === expected.length && expected.every(v => f.values.has(v))

/** 語（曜日）を並べる */
function joinWords(
  values: string[],
  style: ResolvedStyle,
  long = false
): string {
  return values.join(long ? style.longSeparator : style.listSeparator)
}

/** 数値（時刻・分・日・月）を並べる。long は文章なので接続詞を使う */
function joinValues(
  values: string[],
  style: ResolvedStyle,
  long = false
): string {
  return values.join(long ? style.longSeparator : style.valueSeparator)
}

function renderDow(f: Field, style: ResolvedStyle, long: boolean): string {
  if (f.isAll) return ""
  const names = long ? DOW_LONG : DOW_SHORT

  const nth = f.terms.find(t => t.kind === "nth")
  if (nth?.kind === "nth") return `第${nth.nth}${names[nth.dow] ?? ""}`

  if (style.foldWeekdays && sameSet(f, WEEKDAYS)) return "平日"
  if (style.foldWeekdays && sameSet(f, WEEKEND)) return "土日"

  const values = sorted(f)
  if (values.length === 1) {
    const v = values[0] ?? 0
    return long ? (names[v] ?? "") : `${names[v] ?? ""}曜`
  }

  const single = f.terms.length === 1 ? f.terms[0] : undefined
  if (single?.kind === "range") {
    // 「から/まで」で繋ぐときは短い名前でも「曜」を付ける。
    // 「火から木まで」では日付か曜日か読み取りにくい
    const kara = useKara(style, long)
    const suffix = !long && kara ? "曜" : ""
    const from = (names[single.from] ?? "") + suffix
    const to = (names[single.to] ?? "") + suffix
    return kara ? `${from}から${to}まで` : `${from}〜${to}`
  }

  return joinWords(
    values.map(v => names[v] ?? ""),
    style,
    long
  )
}

/** 「1〜7日」「3〜5月」のように、範囲は展開せず範囲のまま表す */
function renderNumeric(f: Field, unit: string, style: ResolvedStyle): string {
  const term = f.terms.length === 1 ? f.terms[0] : undefined
  if (term?.kind === "range") return `${term.from}〜${term.to}${unit}`
  // short/long で同じ文字列を使うので、どちらでも読める語用の区切りにする
  return joinWords(
    sorted(f).map(v => `${v}${unit}`),
    style
  )
}

function renderDom(f: Field, style: ResolvedStyle): string {
  if (f.isAll) return ""
  if (f.terms.some(t => t.kind === "lastDay")) return "末日"

  const term = f.terms.length === 1 ? f.terms[0] : undefined
  if (term?.kind === "step") {
    // "1-7/2" は範囲を落とさず「1〜7日の2日ごと」と書く。
    // "*/3" のように全域へのステップは {freq} が「3日ごと」として引き受ける
    if (term.base.kind === "range") {
      return `${term.base.from}〜${term.base.to}日の${term.step}日ごと`
    }
    return ""
  }

  return renderNumeric(f, "日", style)
}

function renderMonth(f: Field, style: ResolvedStyle): string {
  if (f.isAll) return ""
  return renderNumeric(f, "月", style)
}

/**
 * 時が制約されているときの限定句。「9〜17時の」「3時台の」。
 * 分や秒の周期だけを述べると時の制約が説明から消えるため、必ず前置する
 */
function hourScope(
  f: Field,
  style: ResolvedStyle
): { short: string; long: string } {
  if (f.isAll) return { short: "", long: "" }

  const term = f.terms.length === 1 ? f.terms[0] : undefined
  const range =
    term?.kind === "range"
      ? term
      : term?.kind === "step" && term.base.kind === "range"
        ? term.base
        : null
  const every = term?.kind === "step" ? `${term.step}時間ごとの` : ""
  if (range) {
    const wave = `${range.from}〜${range.to}時の${every}`
    const kara = `${range.from}時から${range.to}時までの${every}`
    return {
      short: useKara(style, false) ? kara : wave,
      long: useKara(style, true) ? kara : wave
    }
  }
  if (every !== "") return { short: every, long: every }

  // 連続していない指定は「3時台」と数える
  const labels = sorted(f).map(v => `${v}時台`)
  return {
    short: `${joinWords(labels, style)}の`,
    long: `${joinWords(labels, style, true)}の`
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

/** 「毎時0分」のように単位語の前に置く数値集合。値を 1 つに落とすと実行が消えて嘘になる */
function renderNumberSet(f: Field, style: ResolvedStyle): string {
  const values = sorted(f)
  if (values.length === 1) return String(values[0])
  const single = f.terms.length === 1 ? f.terms[0] : undefined
  if (single?.kind === "range") return `${single.from}〜${single.to}`
  return joinValues(values.map(String), style)
}

function clock(
  hour: number,
  minute: number,
  second: number | null,
  style: ResolvedStyle,
  long: boolean
): string {
  // 日本語の午前・午後は 0 始まり。深夜は「午前0時」、正午は「午後0時」。
  // 英語圏の 12 AM / 12 PM と違い、「午前12時」は日本語では深夜とも正午とも取れる
  const period = style.hourFormat === "12h" ? (hour < 12 ? "午前" : "午後") : ""
  const h = style.hourFormat === "12h" ? hour % 12 : hour
  if (long) {
    if (second !== null) return `${period}${h}時${pad(minute)}分${second}秒`
    if (style.zeroMinute === "omit" && minute === 0) return `${period}${h}時`
    return `${period}${h}時${pad(minute)}分`
  }
  if (second !== null) return `${period}${h}:${pad(minute)}:${pad(second)}`
  return `${period}${h}:${pad(minute)}`
}

type TimeSegment = {
  short: string
  long: string
  bareCycle: boolean
  cycleWord: boolean
}

function renderTime(schedule: Schedule, style: ResolvedStyle): TimeSegment {
  const { second, minute, hour } = schedule
  const minutes = sorted(minute)
  const hours = sorted(hour)

  // 「9〜17時の」「3時台の」。時の制約を落とさないため、周期語の前に必ず付ける
  const scope = hourScope(hour, style)
  const cycle = (text: string, bare = false): TimeSegment => ({
    short: scope.short + text,
    long: scope.long + text,
    bareCycle: bare && scope.short === "",
    cycleWord: true
  })

  if (second) {
    if (second.isAll) return cycle("毎秒", true)
    const secStep = stepOf(second)
    if (secStep !== null) return cycle(`${secStep}秒ごと`)
    if (minute.isAll) return cycle(`毎分${renderNumberSet(second, style)}秒`)
  }

  if (minute.isAll) return cycle("毎分", true)

  const minStep = stepOf(minute)
  if (minStep !== null) return cycle(`${minStep}分ごと`)

  if (hour.isAll) return cycle(`毎時${renderNumberSet(minute, style)}分`)

  // 「N時間ごとの」は hourScope が前置しているので、ここでは分だけを述べる
  if (stepOf(hour) !== null) return cycle(`${renderNumberSet(minute, style)}分`)

  // 「9,10,11時」と列挙せず「9〜17時の毎時」と範囲で表す。情報は落ちない
  if (hour.terms.length === 1 && hour.terms[0]?.kind === "range") {
    return cycle(`毎時${renderNumberSet(minute, style)}分`)
  }

  // 秒が固定されているなら時刻に含める。落とすと情報が消えて嘘になる
  const sec =
    second && !second.isAll && second.values.size === 1
      ? (sorted(second)[0] ?? null)
      : null

  const shortText = joinValues(
    hours.flatMap(h => minutes.map(mm => clock(h, mm, sec, style, false))),
    style
  )
  const longText = joinValues(
    hours.flatMap(h => minutes.map(mm => clock(h, mm, sec, style, true))),
    style,
    true
  )
  return {
    short: shortText,
    long: longText,
    bareCycle: false,
    cycleWord: false
  }
}

type Unit = "day" | "week" | "month" | "year" | "everyNDays"

function innerUnit(schedule: Schedule): { unit: Unit; everyN: number | null } {
  const { dayOfMonth, dayOfWeek } = schedule
  if (dayOfMonth.isAll && dayOfWeek.isAll) return { unit: "day", everyN: null }
  if (specialTerms(dayOfWeek).length > 0) return { unit: "month", everyN: null }
  if (!dayOfWeek.isAll) return { unit: "week", everyN: null }
  const term = dayOfMonth.terms.length === 1 ? dayOfMonth.terms[0] : undefined
  // 範囲つきステップは日側で「1〜7日の2日ごと」と述べるので、周期語は「毎月」
  if (term?.kind === "step" && term.base.kind === "all") {
    return { unit: "everyNDays", everyN: term.step }
  }
  return { unit: "month", everyN: null }
}

const UNIT_WORD: Record<Exclude<Unit, "everyNDays">, string> = {
  day: "毎日",
  week: "毎週",
  month: "毎月",
  year: "毎年"
}

const FREQUENCY_OF_UNIT: Record<Unit, Frequency> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
  year: "yearly",
  everyNDays: "everyNDays"
}

function partsOf(schedule: Schedule): Parts {
  const put = (f: Field | undefined): number[] | undefined =>
    f && !f.isAll && f.values.size > 0 ? sorted(f) : undefined

  const result: Parts = {}
  const second = put(schedule.second)
  if (second) result.second = second
  const minute = put(schedule.minute)
  if (minute) result.minute = minute
  const hour = put(schedule.hour)
  if (hour) result.hour = hour
  const dayOfMonth = put(schedule.dayOfMonth)
  if (dayOfMonth) result.dayOfMonth = dayOfMonth
  const month = put(schedule.month)
  if (month) result.month = month
  const dayOfWeek = put(schedule.dayOfWeek)
  if (dayOfWeek) result.dayOfWeek = dayOfWeek
  return result
}

export function buildSegments(
  schedule: Schedule,
  style: ResolvedStyle
): BuildResult {
  const time = renderTime(schedule, style)
  const { unit, everyN } = innerUnit(schedule)

  const domConstrained = !schedule.dayOfMonth.isAll
  const dowConstrained = !schedule.dayOfWeek.isAll
  const monthConstrained = !schedule.month.isAll
  const composite = domConstrained && dowConstrained

  const dowShort = renderDow(schedule.dayOfWeek, style, false)
  const dowLong = renderDow(schedule.dayOfWeek, style, true)
  const folded = dowShort === "平日" || dowShort === "土日"

  let dom = renderDom(schedule.dayOfMonth, style)
  let monthText = renderMonth(schedule.month, style)
  let scope = ""
  let freq = unit === "everyNDays" ? `${everyN}日ごと` : UNIT_WORD[unit]

  // 月の載せ方
  if (monthConstrained) {
    if (unit === "month" && domConstrained) {
      freq = UNIT_WORD.year
    } else {
      scope = `${monthText}の`
      monthText = ""
    }
  }

  // 「1月・7月15日」は「1月」と「7月15日」にも読めるので、
  // どちらかが複数のときは月と日の間を「の」で切る
  const monthIsMulti = schedule.month.values.size > 1
  const domIsMulti = schedule.dayOfMonth.values.size > 1
  if (monthText !== "" && dom !== "" && (monthIsMulti || domIsMulti)) {
    monthText += "の"
  }

  // 例外
  if (composite) {
    dom = `毎月${dom}`
    freq = ""
  } else if (folded) {
    freq = ""
  } else if (unit === "day" && time.cycleWord) {
    freq = ""
  }

  // 「平日」「土日」は畳み込みの時点で週の周期を含むので、「毎週」を重ねない
  const orPrefix = composite
    ? style.orConnective + (folded ? "" : UNIT_WORD.week)
    : ""

  const segments: Segments = {
    scope,
    freq,
    month: monthText,
    dom,
    dow: dowShort === "" ? "" : orPrefix + dowShort,
    dowLong: dowLong === "" ? "" : orPrefix + dowLong,
    time: time.short,
    timeLong: time.long,
    hour:
      schedule.hour.values.size === 1 ? String(sorted(schedule.hour)[0]) : "",
    minute:
      schedule.minute.values.size === 1
        ? String(sorted(schedule.minute)[0])
        : "",
    second:
      schedule.second && schedule.second.values.size === 1
        ? String(sorted(schedule.second)[0])
        : ""
  }

  const frequency: Frequency = composite
    ? "composite"
    : freq === "" && time.cycleWord
      ? timeFrequency(schedule, time)
      : FREQUENCY_OF_UNIT[unit]

  return {
    segments,
    frequency,
    parts: partsOf(schedule),
    bareCycleTime: time.bareCycle
  }
}

function timeFrequency(schedule: Schedule, time: TimeSegment): Frequency {
  if (time.short.endsWith("秒ごと")) return "everyNSeconds"
  if (time.short.endsWith("分ごと")) return "everyNMinutes"
  if (time.short.endsWith("時間ごと")) return "everyNHours"
  if (time.short === "毎秒") return "everySecond"
  if (time.short === "毎分") return "everyMinute"
  if (schedule.hour.isAll) return "everyHour"
  return "daily"
}
