// 機械生成コーパス。各フィールドの代表値の直積を作る。
//
// ここには文字列の期待値を一切書かない。不変条件（I1〜I7）と意味の検証にだけ使う。
// 「網羅」はこちらで、「読みやすさ」は cases.ts で担保する。

const perField = {
  minute: ["*", "0", "0,30", "10-20", "*/5", "*/7", "3/5"],
  hour: ["*", "3", "1,13", "9-17", "*/2"],
  dom: ["*", "1", "15", "1,15", "*/3"],
  month: ["*", "1", "1,7", "JAN", "3-5"],
  dow: ["*", "1", "1-5", "0,6", "1,3,5", "MON"]
} as const

export const generated: string[] = perField.minute.flatMap(minute =>
  perField.hour.flatMap(hour =>
    perField.dom.flatMap(dom =>
      perField.month.flatMap(month =>
        perField.dow.map(dow => `${minute} ${hour} ${dom} ${month} ${dow}`)
      )
    )
  )
)

// 秒つき（6 フィールド）。日付軸は 5 フィールド側で覆えているので、
// ここは時刻軸（秒・分・時）の組み合わせに絞る
const perTimeField = {
  second: ["*", "0", "0,30", "*/30", "15/30"],
  minute: ["*", "5", "10-20", "*/5"],
  hour: ["*", "9", "9-17", "*/2"]
} as const

export const generatedSixField: string[] = perTimeField.second.flatMap(second =>
  perTimeField.minute.flatMap(minute =>
    perTimeField.hour.map(hour => `${second} ${minute} ${hour} * * *`)
  )
)
