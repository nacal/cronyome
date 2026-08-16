/**
 * 内部表現。`cronyome/internal` から公開しているが、**v1 まで安定性を保証しない**。
 *
 * 主エントリから出していないのは、再圧縮アルゴリズムを変えただけで
 * 破壊的変更になってしまうため。範囲か列挙かという「表現の意図」が
 * どうしても必要な場合にだけ使うこと。通常は `parts` で足りる。
 *
 * @module
 */

/**
 * フィールドの 1 項（カンマ区切りの 1 要素）。
 *
 * 値集合ではなく**書かれ方**を保持する。`1-5` と `1,2,3,4,5` は同じ値集合になるが、
 * 前者だけが「月〜金」と表示できるため、この区別を捨てられない。
 */
export type FieldTerm =
  /** `*`（および dom / dow の `?`） */
  | { kind: "all" }
  /** `3`、`MON`、`JAN` */
  | { kind: "value"; value: number }
  /** `1-5`、`MON-FRI` */
  | { kind: "range"; from: number; to: number }
  /** `*∕5`、`1-5∕2`。`5/10` は `5-59/10` として保持される */
  | { kind: "step"; base: FieldTerm; step: number }
  /** `L`（月の末日） */
  | { kind: "lastDay" }
  /** `15W`（15 日に最も近い平日）。v0.2 で対応予定 */
  | { kind: "nearestWeekday"; day: number }
  /** `5#3`（第 3 金曜） */
  | { kind: "nth"; dow: number; nth: number }
  /** `5L`（最終金曜）。v0.2 で対応予定 */
  | { kind: "lastDow"; dow: number }

/**
 * 1 フィールドの解析結果。**表現の意図と値集合を両方持つ**のが要点。
 *
 * `terms` だけだと畳み込みや警告の判定が総当たりになり、
 * `values` だけだと「月〜金」と「月・火・水・木・金」を区別できない。
 */
export type Field = {
  /** 表現の意図。カンマ区切りの各項をそのまま保持する */
  terms: FieldTerm[]
  /** 展開済みの値。`L` / `W` / `#` は展開できないので含まれない */
  values: ReadonlySet<number>
  /** そのフィールドが `*` か（`values` が全域でも、`0-59` と書かれていれば false） */
  isAll: boolean
}

/** 式全体の意味モデル。タイムゾーン変換はこの型から同じ型への純粋変換として行う */
export type Schedule = {
  /** 6 フィールド指定のときだけ存在する */
  second?: Field
  minute: Field
  hour: Field
  dayOfMonth: Field
  month: Field
  dayOfWeek: Field
  /** タイムゾーン変換の結果。未変換なら null */
  tz: { shifted: boolean; offsetMinutes: number } | null
}
