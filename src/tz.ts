import type { Field, FieldTerm, Schedule } from "./internal"

// Intl でゾーン名を解決する。npm 依存は増えない。

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone)
  if (cached) return cached
  // 生成コストが高いのでゾーンごとにメモ化する
  const created = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
  formatterCache.set(timeZone, created)
  return created
}

export function offsetMinutes(timeZone: string, at: Date): number {
  const parts = formatterFor(timeZone).formatToParts(at)
  const get = (type: string): number =>
    Number(parts.find(p => p.type === type)?.value ?? "0")
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  )
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** 値集合を terms に再圧縮する。手順を固定して決定的にする */
export function recompress(
  values: number[],
  min: number,
  max: number
): FieldTerm[] {
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  if (sorted.length === 0) return [{ kind: "all" }]
  if (sorted.length === max - min + 1) return [{ kind: "all" }]

  const remaining = new Set(sorted)
  const terms: FieldTerm[] = []

  // ① 最長の連続 run（長さ 3 以上）を左から貪欲に抽出
  for (const start of sorted) {
    if (!remaining.has(start)) continue
    let end = start
    while (remaining.has(end + 1)) end++
    if (end - start + 1 >= 3) {
      for (let v = start; v <= end; v++) remaining.delete(v)
      terms.push({ kind: "range", from: start, to: end })
    }
  }

  // ② 残余から最長の等間隔 run（長さ 3 以上、間隔 2 以上）を左から貪欲に抽出
  for (const start of sorted) {
    if (!remaining.has(start)) continue
    let best: { step: number; end: number; count: number } | null = null
    for (let step = 2; step <= max - min; step++) {
      let count = 1
      let v = start + step
      while (remaining.has(v)) {
        count++
        v += step
      }
      if (count >= 3 && (best === null || count > best.count)) {
        best = { step, end: v - step, count }
      }
    }
    if (best) {
      for (let v = start; v <= best.end; v += best.step) remaining.delete(v)
      terms.push({
        kind: "step",
        base: { kind: "range", from: start, to: best.end },
        step: best.step
      })
    }
  }

  // ③ 残りを単値として昇順に
  for (const v of sorted)
    if (remaining.has(v)) terms.push({ kind: "value", value: v })

  return terms
}

function fieldFrom(values: number[], min: number, max: number): Field {
  return {
    terms: recompress(values, min, max),
    values: new Set(values),
    isAll: new Set(values).size === max - min + 1
  }
}

/**
 * 日の指定を carry 日ずらす。表現できない場合は null。
 *
 * どの月にも存在する日でなければ、ずらした式は元と一致しない。
 * 例えば 28 日を +1 すると 29 日になるが、平年の 2 月には 29 日が無い。
 * 末日と 1 日は互いに移り合う（末日の翌日は翌月 1 日、1 日の前日は前月末日）。
 */
function shiftDayOfMonth(
  f: Field,
  carry: number,
  monthConstrained: boolean
): Field | null {
  if (f.isAll) return f

  const terms: FieldTerm[] = []
  const values = new Set<number>()
  let crossesMonth = false

  for (const t of f.terms) {
    if (t.kind === "lastDay") {
      // 末日の翌日は必ず翌月 1 日。前日は「末日の 1 つ前」で、cron に語彙が無い
      if (carry !== 1) return null
      terms.push({ kind: "value", value: 1 })
      values.add(1)
      crossesMonth = true
    } else if (t.kind === "value") {
      if (t.value === 1 && carry === -1) {
        terms.push({ kind: "lastDay" })
        crossesMonth = true
      } else {
        const v = t.value + carry
        // 29〜31 日はどの月にもあるとは限らない
        if (v < 1 || v > 28) return null
        terms.push({ kind: "value", value: v })
        values.add(v)
      }
    } else if (t.kind === "range") {
      const from = t.from + carry
      const to = t.to + carry
      if (from < 1 || to > 28) return null
      terms.push({ kind: "range", from, to })
      for (let v = from; v <= to; v++) values.add(v)
    } else {
      // ステップ・第N曜日・直近の平日は、ずらすと別の意味になる
      return null
    }
  }

  // 月をまたぐずれは、月の指定があるとその月もずらす必要がある
  if (crossesMonth && monthConstrained) return null

  return { terms, values, isAll: false }
}

export type ShiftOutcome = {
  schedule: Schedule
  /** 変換できなかった場合は false。表示側はこれを見て判断する */
  shifted: boolean
}

export function shiftSchedule(
  schedule: Schedule,
  from: string,
  to: string,
  referenceDate: Date
): ShiftOutcome {
  const delta =
    offsetMinutes(to, referenceDate) - offsetMinutes(from, referenceDate)
  if (delta === 0) return { schedule, shifted: false }

  // 変換できないケースは、誤った時刻を出さないために変換せずに返す。
  // 呼び出し側は shifted: false で判断する
  const unrepresentable = (): ShiftOutcome => ({ schedule, shifted: false })

  if (delta % 60 !== 0) {
    return unrepresentable()
  }

  const deltaHours = delta / 60
  const hours = [...schedule.hour.values]
  const carries = new Set(hours.map(h => Math.floor((h + deltaHours) / 24)))
  const newHours = hours.map(h => (((h + deltaHours) % 24) + 24) % 24)

  if (carries.size > 1) {
    return unrepresentable()
  }

  const carry = [...carries][0] ?? 0
  const shiftedDom =
    carry === 0
      ? schedule.dayOfMonth
      : shiftDayOfMonth(schedule.dayOfMonth, carry, !schedule.month.isAll)
  if (shiftedDom === null) return unrepresentable()

  const shiftedDow = !schedule.dayOfWeek.isAll
    ? fieldFrom(
        [...schedule.dayOfWeek.values].map(d => (((d + carry) % 7) + 7) % 7),
        0,
        6
      )
    : schedule.dayOfWeek

  return {
    schedule: {
      ...schedule,
      hour: fieldFrom(newHours, 0, 23),
      dayOfMonth: shiftedDom,
      dayOfWeek: shiftedDow,
      tz: { shifted: true, offsetMinutes: delta }
    },
    shifted: true
  }
}
