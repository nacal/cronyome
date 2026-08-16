// 一様乱数だとほとんどが読みにくい式になるので、実際に書かれる形に寄せて重みを付ける
const CANDIDATES = {
  minute: [
    "0",
    "0",
    "0",
    "30",
    "15",
    "45",
    "0,30",
    "*/5",
    "*/10",
    "*/15",
    "*/7",
    "*"
  ],
  hour: [
    "*",
    "0",
    "3",
    "6",
    "9",
    "12",
    "18",
    "22",
    "1,13",
    "9-17",
    "*/2",
    "*/6"
  ],
  dom: ["*", "*", "*", "*", "*", "1", "15", "1,15", "*/3", "L"],
  month: ["*", "*", "*", "*", "*", "*", "1", "1,7", "3-5", "12"],
  dow: ["*", "*", "*", "1-5", "1", "5", "0,6", "1,3,5", "MON"]
} as const

const pick = (list: readonly string[]): string =>
  list[Math.floor(Math.random() * list.length)] ?? "*"

export function randomExpression(): string {
  const minute = pick(CANDIDATES.minute)
  const hour = pick(CANDIDATES.hour)
  // 分と時が両方 * だと毎分になり、説明として面白みが無い
  const safeMinute = minute === "*" && hour === "*" ? "0" : minute
  return [
    safeMinute,
    hour,
    pick(CANDIDATES.dom),
    pick(CANDIDATES.month),
    pick(CANDIDATES.dow)
  ].join(" ")
}
