import type { Style } from "../../src/index"

// 手書きのケース表。実装の出力と 1 対 1 で対応する。
// ここに載っているケースだけが「文字列の期待値」を持つ。機械生成コーパス（generated.ts）は
// 不変条件と意味の検証にのみ使い、文字列は検証しない。

/** 規則の網羅を機械検査するためのタグ */
export type Tag =
  // 日付軸の周期語（§5.2.1 の U）
  | "freq:daily"
  | "freq:weekly"
  | "freq:monthly"
  | "freq:yearly"
  | "freq:everyNDays"
  | "freq:suppressed"
  // 月の載せ方
  | "scope:used"
  | "month:positional"
  // 既定以外のスタイル
  | "style:12h"
  | "style:zeroMinute"
  | "style:noFold"
  | "style:rangeStyle"
  | "style:separator"
  | "style:orConnective"
  | "parse:dowStartsAt"
  // 時の限定句（範囲・時台）
  | "hour:window"
  | "hour:hourly"
  | "hour:scope"
  // 範囲をそのまま表す
  | "dom:range"
  | "month:range"
  | "dom:stepInRange"
  // 時刻軸（§5.2.2）
  | "time:everySecond"
  | "time:everyMinute"
  | "time:everyHour"
  | "time:stepSecond"
  | "time:stepMinute"
  | "time:stepHour"
  /** 起点つきステップ（`3/10`）。起点を落とすと `*∕10` と同じ説明になる */
  | "time:stepOffset"
  /** 範囲つきステップ（`10-50/10`）。範囲を落とすと一時間中動くように読める */
  | "time:stepInRange"
  | "time:fixed"
  | "time:multi"
  // 畳み込み
  | "fold:weekday"
  | "fold:weekend"
  | "fold:none"
  // 複合
  | "composite"
  // タイムゾーン
  | "tz:none"
  | "tz:sameDay"
  | "tz:dayCross"
  | "tz:dowShift"
  | "tz:unrepresentable"
  | "tz:dst"

export type Case = {
  expr: string
  short: string
  long: string
  fields?: 5 | 6
  tz?: { from: string; to: string }
  /** 既定以外のスタイルで検証したいとき */
  style?: Style
  /** 曜日の基点。1 は Quartz 方言 */
  dowStartsAt?: 0 | 1
  tags: Tag[]
}

export const cases: Case[] = [
  {
    expr: "* * * * *",
    short: "毎分",
    long: "毎分実行",
    tags: ["time:everyMinute", "freq:suppressed", "tz:none"]
  },
  {
    expr: "*/5 * * * *",
    short: "5分ごと",
    long: "5分ごとに実行",
    tags: ["time:stepMinute", "freq:suppressed", "tz:none"]
  },
  {
    expr: "*/7 * * * *",
    short: "7分ごと",
    long: "7分ごとに実行",
    tags: ["time:stepMinute", "freq:suppressed", "tz:none"]
  },
  {
    // 起点つきステップ。"3/10" は "3-59/10" の略記で、実行は 3 分ずれている。
    // 刻み幅だけを述べると "*/10" と同じ説明になる
    expr: "3/10 * * * *",
    short: "3分から10分ごと",
    long: "3分から10分ごとに実行",
    tags: ["time:stepOffset", "freq:suppressed", "tz:none"]
  },
  {
    // 起点が下限、終端が上限なら "*/10" と同じ値集合なので、起点は書かない
    expr: "0/10 * * * *",
    short: "10分ごと",
    long: "10分ごとに実行",
    tags: ["time:stepMinute", "freq:suppressed", "tz:none"]
  },
  {
    // 分の範囲つきステップ。範囲が落ちると毎時間ずっと動くように読める
    expr: "10-50/10 * * * *",
    short: "10〜50分の10分ごと",
    long: "10〜50分の10分ごとに実行",
    tags: ["time:stepInRange", "freq:suppressed", "tz:none"]
  },
  {
    // "55/10" は 55 分の 1 回しか回らない。周期語で述べると複数回に読める
    expr: "55/10 * * * *",
    short: "毎時55分",
    long: "毎時55分に実行",
    tags: ["time:everyHour", "freq:suppressed", "tz:none"]
  },
  {
    expr: "0 * * * *",
    short: "毎時0分",
    long: "毎時0分に実行",
    tags: ["time:everyHour", "freq:suppressed", "tz:none"]
  },
  {
    expr: "0 */2 * * *",
    short: "2時間ごとの0分",
    long: "2時間ごとの0分に実行",
    tags: ["time:stepHour", "freq:suppressed", "tz:none"]
  },
  {
    expr: "30 3 * * *",
    short: "毎日 3:30",
    long: "毎日3時30分に実行",
    tags: ["freq:daily", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3,15 * * *",
    short: "毎日 3:00, 15:00",
    long: "毎日3時00分と15時00分に実行",
    tags: ["freq:daily", "time:multi", "tz:none"]
  },
  {
    expr: "0 3 * * 1",
    short: "毎週月曜 3:00",
    long: "毎週月曜日の3時00分に実行",
    tags: ["freq:weekly", "fold:none", "time:fixed", "tz:none"]
  },
  {
    expr: "0 * * * 1",
    short: "毎週月曜 毎時0分",
    long: "毎週月曜日の毎時0分に実行",
    tags: ["freq:weekly", "time:everyHour", "fold:none", "tz:none"]
  },
  {
    expr: "0 3 * * 1-5",
    short: "平日 3:00",
    long: "平日の3時00分に実行",
    tags: ["fold:weekday", "freq:suppressed", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 * * 0,6",
    short: "土日 3:00",
    long: "土日の3時00分に実行",
    tags: ["fold:weekend", "freq:suppressed", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 * * 1,3,5",
    short: "毎週月・水・金 3:00",
    long: "毎週月曜日と水曜日と金曜日の3時00分に実行",
    tags: ["freq:weekly", "fold:none", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 1 * *",
    short: "毎月1日 3:00",
    long: "毎月1日の3時00分に実行",
    tags: ["freq:monthly", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 */3 * *",
    short: "3日ごと 3:00",
    long: "3日ごとの3時00分に実行",
    tags: ["freq:everyNDays", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 1 * 5",
    short: "毎月1日または毎週金曜 3:00",
    long: "毎月1日または毎週金曜日の3時00分に実行",
    tags: ["composite", "freq:suppressed", "time:fixed", "tz:none"]
  },
  {
    expr: "0 0 1 1 *",
    short: "毎年1月1日 0:00",
    long: "毎年1月1日の0時00分に実行",
    tags: ["freq:yearly", "month:positional", "time:fixed", "tz:none"]
  },
  {
    // 「平日」は畳み込みの時点で週の周期を含むので「または毎週平日」にはしない
    expr: "0 3 1 * 1-5",
    short: "毎月1日または平日 3:00",
    long: "毎月1日または平日の3時00分に実行",
    tags: [
      "composite",
      "fold:weekday",
      "freq:suppressed",
      "time:fixed",
      "tz:none"
    ]
  },
  {
    // 限定句「12月の」の直後に区切りの空白を残さない
    expr: "*/7 * * 12 *",
    short: "12月の7分ごと",
    long: "12月の7分ごとに実行",
    tags: ["scope:used", "time:stepMinute", "freq:suppressed", "tz:none"]
  },
  {
    // 最重要ケース。旧設計は「毎年1月 3:00」と出力して嘘になっていた
    expr: "0 3 * 1 *",
    short: "1月の毎日 3:00",
    long: "1月の毎日3時00分に実行",
    tags: ["scope:used", "freq:daily", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 * 1 1",
    short: "1月の毎週月曜 3:00",
    long: "1月の毎週月曜日の3時00分に実行",
    tags: ["scope:used", "freq:weekly", "fold:none", "time:fixed", "tz:none"]
  },
  {
    expr: "*/30 * * * * *",
    fields: 6,
    short: "30秒ごと",
    long: "30秒ごとに実行",
    tags: ["time:stepSecond", "freq:suppressed", "tz:none"]
  },
  {
    // 秒にも同じ規則を効かせる
    expr: "15/30 * * * * *",
    fields: 6,
    short: "15秒から30秒ごと",
    long: "15秒から30秒ごとに実行",
    tags: ["time:stepSecond", "time:stepOffset", "freq:suppressed", "tz:none"]
  },
  {
    expr: "* * * * * *",
    fields: 6,
    short: "毎秒",
    long: "毎秒実行",
    tags: ["time:everySecond", "freq:suppressed", "tz:none"]
  },
  {
    // 秒が固定のときに時刻から落ちないこと（落とすと情報が消えて嘘になる）
    expr: "30 0 3 * * *",
    fields: 6,
    short: "毎日 3:00:30",
    long: "毎日3時00分30秒に実行",
    tags: ["freq:daily", "time:fixed", "tz:none"]
  },

  // --- 範囲・限定句（列挙に潰さず範囲のまま表す） ---
  {
    expr: "0 9-17 * * *",
    short: "9〜17時の毎時0分",
    long: "9時から17時までの毎時0分に実行",
    tags: ["hour:window", "freq:suppressed", "time:everyHour", "tz:none"]
  },
  {
    // 範囲つきステップ。範囲が落ちると一日中動くように読める
    expr: "0 9-17/2 * * *",
    short: "9〜17時の2時間ごとの0分",
    long: "9時から17時までの2時間ごとの0分に実行",
    tags: ["hour:window", "freq:suppressed", "time:stepHour", "tz:none"]
  },
  {
    // 分の周期だけを述べると時の制約が消える
    expr: "*/5 9-17 * * *",
    short: "9〜17時の5分ごと",
    long: "9時から17時までの5分ごとに実行",
    tags: ["hour:window", "freq:suppressed", "time:stepMinute", "tz:none"]
  },
  {
    expr: "* 3 * * *",
    short: "3時台の毎分",
    long: "3時台の毎分に実行",
    tags: ["hour:scope", "freq:suppressed", "time:everyMinute", "tz:none"]
  },
  {
    expr: "*/5 1,13 * * *",
    short: "1時台・13時台の5分ごと",
    long: "1時台と13時台の5分ごとに実行",
    tags: ["hour:scope", "freq:suppressed", "time:stepMinute", "tz:none"]
  },
  {
    expr: "0 3 1-7 * *",
    short: "毎月1〜7日 3:00",
    long: "毎月1〜7日の3時00分に実行",
    tags: ["dom:range", "freq:monthly", "time:fixed", "tz:none"]
  },
  {
    // 日の範囲つきステップ。範囲が落ちると月中ずっと 2 日おきに読める
    expr: "0 3 1-7/2 * *",
    short: "毎月1〜7日の2日ごと 3:00",
    long: "毎月1〜7日の2日ごとの3時00分に実行",
    tags: ["dom:stepInRange", "freq:monthly", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 15 3-5 *",
    short: "毎年3〜5月の15日 3:00",
    long: "毎年3〜5月の15日の3時00分に実行",
    tags: [
      "month:range",
      "freq:yearly",
      "month:positional",
      "time:fixed",
      "tz:none"
    ]
  },
  {
    // 「1月・7月15日」は「1月」と「7月15日」にも読めるので「の」で切る
    expr: "0 3 15 1,7 *",
    short: "毎年1月・7月の15日 3:00",
    long: "毎年1月・7月の15日の3時00分に実行",
    tags: ["freq:yearly", "month:positional", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 * * 2-4",
    short: "毎週火〜木 3:00",
    long: "毎週火曜日から木曜日までの3時00分に実行",
    tags: ["freq:weekly", "fold:none", "time:fixed", "tz:none"]
  },

  // --- タイムゾーン変換 ---
  {
    expr: "0 3 * * *",
    tz: { from: "UTC", to: "Asia/Tokyo" },
    short: "毎日 12:00",
    long: "毎日12時00分に実行",
    tags: ["tz:sameDay", "freq:daily", "time:fixed"]
  },
  {
    expr: "0 23 * * *",
    tz: { from: "UTC", to: "Asia/Tokyo" },
    short: "毎日 8:00",
    long: "毎日8時00分に実行",
    tags: ["tz:dayCross", "freq:daily", "time:fixed"]
  },
  {
    expr: "0 23 * * 1",
    tz: { from: "UTC", to: "Asia/Tokyo" },
    short: "毎週火曜 8:00",
    long: "毎週火曜日の8時00分に実行",
    tags: ["tz:dowShift", "freq:weekly", "fold:none", "time:fixed"]
  },
  {
    // 複合でも、日と曜日それぞれをずらせるなら変換する
    expr: "0 23 1 * 5",
    tz: { from: "UTC", to: "Asia/Tokyo" },
    short: "毎月2日または毎週土曜 8:00",
    long: "毎月2日または毎週土曜日の8時00分に実行",
    tags: ["tz:dayCross", "composite", "freq:suppressed", "time:fixed"]
  },
  {
    // 末日の翌日は翌月 1 日。月末バッチを月初表示に変換できる
    expr: "0 20 L * *",
    tz: { from: "UTC", to: "Asia/Tokyo" },
    short: "毎月1日 5:00",
    long: "毎月1日の5時00分に実行",
    tags: ["tz:dayCross", "freq:monthly", "time:fixed"]
  },
  {
    // 31 日はどの月にもあるわけではないので、ずらすと元と一致しない
    expr: "0 23 31 * *",
    tz: { from: "UTC", to: "Asia/Tokyo" },
    short: "毎月31日 23:00",
    long: "毎月31日の23時00分に実行",
    tags: ["tz:unrepresentable", "freq:monthly", "time:fixed"]
  },
  {
    expr: "0 3 * * *",
    tz: { from: "UTC", to: "America/New_York" },
    short: "毎日 22:00",
    long: "毎日22時00分に実行",
    tags: ["tz:dst", "freq:daily", "time:fixed"]
  },

  // --- 既定以外のスタイル ---
  {
    // 日本語の午前・午後は 0 始まり。「午前12時」は深夜とも正午とも取れて紛らわしい
    expr: "0 0 * * *",
    style: { hourFormat: "12h" },
    short: "毎日 午前0:00",
    long: "毎日午前0時00分に実行",
    tags: ["style:12h", "freq:daily", "time:fixed", "tz:none"]
  },
  {
    expr: "0 12 * * *",
    style: { hourFormat: "12h" },
    short: "毎日 午後0:00",
    long: "毎日午後0時00分に実行",
    tags: ["style:12h", "freq:daily", "time:fixed", "tz:none"]
  },
  {
    expr: "30 15 * * *",
    style: { hourFormat: "12h" },
    short: "毎日 午後3:30",
    long: "毎日午後3時30分に実行",
    tags: ["style:12h", "freq:daily", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 * * *",
    style: { zeroMinute: "omit" },
    short: "毎日 3:00",
    long: "毎日3時に実行",
    tags: ["style:zeroMinute", "freq:daily", "time:fixed", "tz:none"]
  },
  {
    expr: "0 3 * * 1-5",
    style: { foldWeekdays: false },
    short: "毎週月〜金 3:00",
    long: "毎週月曜日から金曜日までの3時00分に実行",
    tags: ["style:noFold", "freq:weekly", "fold:none", "time:fixed", "tz:none"]
  },
  {
    // 指定すると short も long も同じ形になる
    expr: "0 3 * * 2-4",
    style: { rangeStyle: "kara" },
    short: "毎週火曜から木曜まで 3:00",
    long: "毎週火曜日から木曜日までの3時00分に実行",
    tags: [
      "style:rangeStyle",
      "freq:weekly",
      "fold:none",
      "time:fixed",
      "tz:none"
    ]
  },
  {
    expr: "0 9-17 * * *",
    style: { rangeStyle: "wave" },
    short: "9〜17時の毎時0分",
    long: "9〜17時の毎時0分に実行",
    tags: [
      "style:rangeStyle",
      "hour:window",
      "freq:suppressed",
      "time:everyHour",
      "tz:none"
    ]
  },
  {
    expr: "0 3,15 * * 1,3,5",
    style: { listSeparator: "、", valueSeparator: " / ", longSeparator: "、" },
    short: "毎週月、水、金 3:00 / 15:00",
    long: "毎週月曜日、水曜日、金曜日の3時00分、15時00分に実行",
    tags: [
      "style:separator",
      "freq:weekly",
      "fold:none",
      "time:multi",
      "tz:none"
    ]
  },

  {
    expr: "0 3 1 * 5",
    style: { orConnective: "もしくは" },
    short: "毎月1日もしくは毎週金曜 3:00",
    long: "毎月1日もしくは毎週金曜日の3時00分に実行",
    tags: [
      "style:orConnective",
      "composite",
      "freq:suppressed",
      "time:fixed",
      "tz:none"
    ]
  },
  {
    // Quartz 方言では 1 が日曜
    expr: "0 3 * * 1",
    dowStartsAt: 1,
    short: "毎週日曜 3:00",
    long: "毎週日曜日の3時00分に実行",
    tags: [
      "parse:dowStartsAt",
      "freq:weekly",
      "fold:none",
      "time:fixed",
      "tz:none"
    ]
  },
  {
    // 名前形式は方言の影響を受けない。MON は常に月曜
    expr: "0 3 * * MON",
    dowStartsAt: 1,
    short: "毎週月曜 3:00",
    long: "毎週月曜日の3時00分に実行",
    tags: [
      "parse:dowStartsAt",
      "freq:weekly",
      "fold:none",
      "time:fixed",
      "tz:none"
    ]
  }
]
