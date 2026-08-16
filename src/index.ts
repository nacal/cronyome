// 公開 API。型は

import { FormatError, type FormatNode, parseFormat, render } from "./format"
import { buildSegments, DEFAULT_STYLE, type ResolvedStyle } from "./ja"
import { parseExpression } from "./parse"
import { shiftSchedule } from "./tz"

/**
 * cron のフィールド数。
 *
 * `6` は **先頭を秒**として解釈する（node-cron 系の慣習）。
 * 末尾に年を持つ 6 フィールド方言とは判別できないため、自動判定はしない。
 */
export type FieldCount = 5 | 6

/** 実行の周期。UI でバッジや分岐に使う想定 */
export type Frequency =
  | "everySecond"
  | "everyMinute"
  | "everyHour"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "everyNSeconds"
  | "everyNMinutes"
  | "everyNHours"
  | "everyNDays"
  /** 日と曜日の両方が指定されている（OR セマンティクス） */
  | "composite"

/**
 * フォーマット文字列で使えるトークン。
 *
 * 語句トークン（`scope` 〜 `timeLong`）は助数詞・助詞込みで組み立て済み。
 * 素値トークン（`hour` `minute` `second`）は単一値のときだけ展開され、
 * 集合や `*` のときは空文字になる。
 */
export type TokenName =
  | "scope"
  | "freq"
  | "month"
  | "dom"
  | "dow"
  | "dowLong"
  | "time"
  | "timeLong"
  | "hour"
  | "minute"
  | "second"

/** 説明を生成できなかった理由。`describe()` は例外を投げず、この値を返す */
export type ErrorCode =
  | "FIELD_COUNT_MISMATCH"
  | "VALUE_OUT_OF_RANGE"
  | "INVALID_RANGE"
  | "UNKNOWN_TOKEN"
  | "TOKEN_ARGUMENT_NOT_SUPPORTED"
  | "INVALID_STYLE_COMBINATION"

export type CronError = {
  code: ErrorCode
  /** そのまま UI に出せる日本語のメッセージ */
  message: string
}

/**
 * 表記の規約。**アプリ全体で一貫させたいもの**をここに置く。
 *
 * 「同じアプリの 2 画面で違っていたら気持ち悪いか？」が判断基準。
 * 長さの違い（`月` か `月曜日` か）はスタイルではなくトークンで指定する。
 */
export type Style = {
  /**
   * 時刻の表記。`"24h"` は「15:00」、`"12h"` は「午後3:00」。
   *
   * 午前・午後は日本語の流儀で 0 始まりになる（深夜は「午前0:00」、正午は「午後0:00」）。
   * @default "24h"
   */
  hourFormat?: "24h" | "12h"
  /**
   * `{timeLong}` で 0 分を省くか。「3時00分」→「3時」。
   * コロン形式の `{time}` には効かない（「3:」になり成立しないため）。
   * @default "keep"
   */
  zeroMinute?: "keep" | "omit"
  /**
   * 月〜金を「平日」、土日を「土日」に畳み込むか。
   * @default true
   */
  foldWeekdays?: boolean
  /**
   * 語を並べるときの区切り。曜日に使う。「月・水・金」
   * @default "・"
   */
  listSeparator?: string
  /**
   * 数値を並べるときの区切り。short の時刻・分・日・月に使う。「3:00, 15:00」
   *
   * 語と分ける理由は、コロンを含む数値が中黒で並ぶと記号が混み合って読みにくいため。
   * @default ", "
   */
  valueSeparator?: string
  /**
   * long（文章形）で列挙に使う区切り。「月曜日と金曜日」「9時00分と18時00分」
   *
   * long は記号ではなく文なので short と分けている。適用されるのは long 版を持つ
   * `{dowLong}` と `{timeLong}` だけ。日と月は short/long で同じ文字列を使うため、
   * どちらでも読める `listSeparator` を使う。
   * @default "と"
   */
  longSeparator?: string
  /**
   * 範囲の表記。指定すると short と long の両方がその形になる。
   *
   * 未指定なら、short は「月〜金」、long は「月曜日から金曜日まで」と、
   * それぞれの形に自然なほうを使う。
   */
  rangeStyle?: "wave" | "kara"
  /**
   * 日と曜日の複合時に使う接続詞。「毎月1日**または**毎週金曜」
   * @default "または"
   */
  orConnective?: string
}

/** `createDescriber()` に渡す設定。誤りは実行時ではなく生成時に例外で落ちる */
export type DescriberOptions = {
  /**
   * cron のフィールド数。数が合わない式は解釈せずエラーにする。
   * @default 5
   */
  fields?: FieldCount
  /**
   * 曜日の基点。`0` は標準 cron（0 = 日曜）、`1` は Quartz（1 = 日曜）。
   * `MON` のような名前形式はこの設定の影響を受けない。
   * @default 0
   */
  dowStartsAt?: 0 | 1
  /** 表示先のタイムゾーン。`sourceTimeZone` と両方指定したときだけ変換する */
  timeZone?: string
  /**
   * cron 式が書かれているタイムゾーン。k8s の CronJob は既定で UTC。
   * @default "UTC"
   */
  sourceTimeZone?: string
  /**
   * 夏時間のあるゾーンで、どの時点のオフセットを使うか。
   * 夏時間の無いゾーン（JST を含む）では参照されず、結果は完全に決定的になる。
   * SSR ではハイドレーション不一致を避けるため明示を推奨。
   * @default new Date()
   */
  referenceDate?: Date
  /** 表記の規約。アプリ全体で一貫させたいもの */
  style?: Style
  /**
   * 名前付きのカスタムフォーマット。ここに登録したものは `describe(expr, { format: "名前" })` で使える。
   *
   * @example
   * formats: { notice: "[{scope}][{freq}][{month}][{dom}][{dowLong}]の{timeLong}に自動実行されます" }
   */
  formats?: Record<string, string>
}

export type DescribeOptions = {
  /**
   * 組み込み名（`"short"` / `"normal"` / `"long"`）、登録した名前、
   * またはフォーマット文字列そのもの。
   * @default "short"
   */
  format?: string
}

/**
 * UI レイアウト用の安定した形。内部表現は露出しない。
 * `*` のフィールドは undefined になる（「制約されているフィールドだけが載る」）。
 */
export type Parts = {
  second?: number[]
  minute?: number[]
  hour?: number[]
  dayOfMonth?: number[]
  month?: number[]
  dayOfWeek?: number[]
}

export type DescribeResult = {
  /**
   * `format` に応じた文字列。指定が無ければ `short` と同じ。
   * 解釈できない式では入力式そのものが入る（空文字にはしない）。
   */
  text: string
  /** 一覧やテーブルセル向けの短い形。「平日 3:00」 */
  short: string
  /** 詳細画面向けの丁寧な形。「平日の3時00分に実行」 */
  long: string
  /** 実行の周期。バッジ表示や分岐に使う */
  frequency: Frequency
  /** UI レイアウト用の数値。文字列を切り刻まずに強調やバッジを組める */
  parts: Parts
  /** 空でなければ説明を生成できていない。`text` は入力式のまま */
  errors: CronError[]
  /** タイムゾーン変換が実際に行われたか。表現できず見送った場合は false */
  tzShifted: boolean
}

export type Describer = {
  describe(expression: string, options?: DescribeOptions): DescribeResult
}

// ---------------------------------------------------------------------------
// 組み立て
// ---------------------------------------------------------------------------

const SHORT_FORMAT = "[{scope}][{freq}][{month}][{dom}][{dow}] {time}"

const BUILTIN_FORMATS: Record<string, string> = {
  short: SHORT_FORMAT,
  normal: SHORT_FORMAT,
  long: longFormat({ particle: true, bareCycle: false })
}

/**
 * long の連結は 2 か所で揺れる。
 * - 「毎日」の直後は「の」を取らない（「毎日3時00分」であって「毎日の3時00分」ではない）
 * - 「毎分」「毎秒」の直後は「に」を取らない（「毎分に実行」は日本語として成立しない）
 */
function longFormat(opts: { particle: boolean; bareCycle: boolean }): string {
  const particle = opts.particle ? "の" : ""
  const tail = opts.bareCycle ? "実行" : "に実行"
  return `[{scope}][{freq}][{month}][{dom}][{dowLong}]${particle}{timeLong}${tail}`
}

/**
 * 表記のスタイルを固定した変換器を作る。**アプリ起動時に 1 回だけ**呼ぶ想定。
 *
 * 設定やフォーマットの誤りはここで例外を投げる。プログラマのミスを実行時まで
 * 持ち越すと、以降すべての `describe()` が静かに劣化するため。
 *
 * グローバルな既定値の設定は提供していない（SSR でのリクエスト間の漏れ、
 * テストの順序依存、間接依存のコードへの影響を避けるため）。
 *
 * @example
 * const cron = createDescriber({
 *   sourceTimeZone: "UTC",
 *   timeZone: "Asia/Tokyo"
 * })
 *
 * cron.describe("0 3 * * *").short // → "毎日 12:00"
 *
 * @throws フォーマットに未知のトークンがある、設定値が不正、などの場合
 */
export function createDescriber(options: DescriberOptions = {}): Describer {
  const fields = options.fields ?? 5
  const dowStartsAt = options.dowStartsAt ?? 0
  const style: ResolvedStyle = { ...DEFAULT_STYLE, ...options.style }
  const referenceDate = options.referenceDate ?? new Date()
  const sourceTimeZone = options.sourceTimeZone
  const timeZone = options.timeZone

  if (dowStartsAt !== 0 && dowStartsAt !== 1) {
    throw new FormatError(
      `dowStartsAt は 0 か 1 のみです: ${String(dowStartsAt)}`
    )
  }
  if (style.zeroMinute !== "keep" && style.zeroMinute !== "omit") {
    throw new FormatError(`zeroMinute は "keep" か "omit" のみです`)
  }

  // 登録フォーマットは初期化時にパース + 検証する（実行時ではなく起動時に落とす）
  const compiled = new Map<string, FormatNode[]>()
  for (const [name, source] of Object.entries({
    ...BUILTIN_FORMATS,
    ...options.formats
  })) {
    compiled.set(name, parseFormat(source))
  }
  for (const particle of [true, false]) {
    for (const bareCycle of [true, false]) {
      const source = longFormat({ particle, bareCycle })
      compiled.set(source, parseFormat(source))
    }
  }

  const inlineCache = new Map<string, FormatNode[]>()
  const nodesFor = (format: string): FormatNode[] => {
    const registered = compiled.get(format)
    if (registered) return registered
    const cached = inlineCache.get(format)
    if (cached) return cached
    const parsed = parseFormat(format)
    inlineCache.set(format, parsed)
    return parsed
  }

  const fallback = (
    expression: string,
    errors: CronError[]
  ): DescribeResult => {
    const text = expression.trim() === "" ? "" : expression.trim()
    return {
      text,
      short: text,
      long: text,
      frequency: "daily",
      parts: {},
      errors,
      tzShifted: false
    }
  }

  return {
    describe(
      expression: string,
      describeOptions: DescribeOptions = {}
    ): DescribeResult {
      const parsed = parseExpression(expression, fields, dowStartsAt)
      if (!parsed.schedule) return fallback(expression, parsed.errors)

      let schedule = parsed.schedule
      let tzShifted = false
      if (sourceTimeZone && timeZone) {
        const outcome = shiftSchedule(
          schedule,
          sourceTimeZone,
          timeZone,
          referenceDate
        )
        schedule = outcome.schedule
        tzShifted = outcome.shifted
      }

      const built = buildSegments(schedule, style)
      const { segments } = built
      // 「毎日」の直後だけ「の」を取らない
      const particle = !(
        segments.freq === "毎日" &&
        segments.dom === "" &&
        segments.dowLong === ""
      )

      const short = render(nodesFor("short"), segments)
      const long = render(
        nodesFor(longFormat({ particle, bareCycle: built.bareCycleTime })),
        segments
      )

      const requested = describeOptions.format ?? "short"
      const nodes = nodesFor(requested)
      const text =
        requested === "short"
          ? short
          : requested === "long"
            ? long
            : render(nodes, segments)

      return {
        text,
        short,
        long,
        frequency: built.frequency,
        parts: built.parts,
        errors: [],
        tzShifted
      }
    }
  }
}

const defaultDescriber: Describer = createDescriber()

/**
 * cron 式を日本語に変換する。既定のスタイル（5 フィールド・24 時間表記・
 * タイムゾーン変換なし）を使う簡易版。
 *
 * 表記を揃えたい場合や、タイムゾーン変換が必要な場合は {@link createDescriber} を使う。
 *
 * **例外を投げない。** 解釈できない式は `errors` に理由が入り、`text` には
 * 入力式がそのまま入る（UI が空欄になるより害が小さいため）。
 *
 * @example
 * describe("0 3 * * 1-5").short // → "平日 3:00"
 * describe("0 3 * 1 *").short   // → "1月の毎日 3:00"（1 月中は毎日動く。年 1 回ではない）

 *
 * @example 解釈できない式でも例外は投げない
 * describe("0 60 * * *").errors[0].code // → "VALUE_OUT_OF_RANGE"
 * describe("0 60 * * *").text           // → "0 60 * * *"（入力式がそのまま入る）
 */
export function describe(
  expression: string,
  options?: DescribeOptions
): DescribeResult {
  return defaultDescriber.describe(expression, options)
}
