import type { CronError, FieldCount } from "./index"
import type { Field, FieldTerm, Schedule } from "./internal"

type FieldSpec = {
  min: number
  max: number
  names?: readonly string[]
  allowQuestion?: boolean
  allowLastDay?: boolean
  allowNth?: boolean
  /** 7 を 0 に正規化する（日曜） */
  wrapSeven?: boolean
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC"
]
const DOWS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

const SPECS = {
  second: { min: 0, max: 59 },
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31, allowQuestion: true, allowLastDay: true },
  month: { min: 1, max: 12, names: MONTHS },
  dayOfWeek: {
    min: 0,
    max: 6,
    names: DOWS,
    allowQuestion: true,
    allowNth: true,
    wrapSeven: true
  }
} satisfies Record<string, FieldSpec>

export type ParseOutcome = {
  schedule: Schedule | null
  errors: CronError[]
}

const err = (code: CronError["code"], message: string): CronError => ({
  code,
  message
})

function expand(terms: FieldTerm[], spec: FieldSpec): Set<number> {
  const values = new Set<number>()
  const push = (term: FieldTerm, filter?: (v: number) => boolean): void => {
    if (term.kind === "all") {
      for (let v = spec.min; v <= spec.max; v++)
        if (!filter || filter(v)) values.add(v)
    } else if (term.kind === "value") {
      if (!filter || filter(term.value)) values.add(term.value)
    } else if (term.kind === "range") {
      for (let v = term.from; v <= term.to; v++)
        if (!filter || filter(v)) values.add(v)
    }
  }

  for (const term of terms) {
    if (term.kind === "step") {
      const start =
        term.base.kind === "range"
          ? term.base.from
          : term.base.kind === "value"
            ? term.base.value
            : spec.min
      push(term.base, v => (v - start) % term.step === 0)
    } else {
      push(term)
    }
  }
  return values
}

/** 名前形式かどうかを返すのは、曜日の基点補正を名前に当てないため */
function parseNumber(
  token: string,
  spec: FieldSpec
): { value: number; named: boolean } | null {
  const upper = token.toUpperCase()
  const named = spec.names?.indexOf(upper) ?? -1
  if (named >= 0) {
    return { value: named + (spec.names === MONTHS ? 1 : 0), named: true }
  }
  if (!/^\d+$/.test(token)) return null
  return { value: Number(token), named: false }
}

function normalize(
  parsed: { value: number; named: boolean },
  spec: FieldSpec,
  dowStartsAt: 0 | 1
): number {
  if (!spec.wrapSeven) return parsed.value
  // MON は方言に関わらず月曜。基点の補正は数値で書かれたときだけ効かせる
  const shifted =
    dowStartsAt === 1 && !parsed.named ? parsed.value - 1 : parsed.value
  return shifted === 7 ? 0 : shifted
}

function parseField(
  raw: string,
  spec: FieldSpec,
  fieldName: string,
  dowStartsAt: 0 | 1,
  errors: CronError[]
): Field {
  const terms: FieldTerm[] = []

  for (const item of raw.split(",")) {
    const token = item.trim()
    if (token === "") {
      errors.push(err("VALUE_OUT_OF_RANGE", `${fieldName}に空の項目があります`))
      continue
    }

    if (token === "*" || (token === "?" && spec.allowQuestion)) {
      terms.push({ kind: "all" })
      continue
    }
    if (token === "L" && spec.allowLastDay) {
      terms.push({ kind: "lastDay" })
      continue
    }
    if (token.includes("#") && spec.allowNth) {
      const [dowRaw = "", nthRaw = ""] = token.split("#")
      const dow = parseNumber(dowRaw, spec)
      const nth = Number(nthRaw)
      if (dow === null || !Number.isInteger(nth) || nth < 1 || nth > 5) {
        errors.push(
          err("VALUE_OUT_OF_RANGE", `${fieldName}の指定が不正です: ${token}`)
        )
        continue
      }
      terms.push({ kind: "nth", dow: normalize(dow, spec, dowStartsAt), nth })
      continue
    }

    const [baseRaw = "", stepRaw] = token.split("/")
    let base: FieldTerm | null = null

    if (baseRaw === "*" || (baseRaw === "?" && spec.allowQuestion)) {
      base = { kind: "all" }
    } else if (baseRaw.includes("-")) {
      const [fromRaw = "", toRaw = ""] = baseRaw.split("-")
      const from = parseNumber(fromRaw, spec)
      const to = parseNumber(toRaw, spec)
      if (from === null || to === null) {
        errors.push(
          err("VALUE_OUT_OF_RANGE", `${fieldName}の値が不正です: ${token}`)
        )
        continue
      }
      const nf = normalize(from, spec, dowStartsAt)
      const nt = normalize(to, spec, dowStartsAt)
      if (nf < spec.min || nt > spec.max) {
        errors.push(
          err("VALUE_OUT_OF_RANGE", `${fieldName}の値が範囲外です: ${token}`)
        )
        continue
      }
      if (nf > nt) {
        errors.push(
          err("INVALID_RANGE", `${fieldName}の範囲が逆順です: ${token}`)
        )
        continue
      }
      base = { kind: "range", from: nf, to: nt }
    } else {
      const value = parseNumber(baseRaw, spec)
      if (value === null) {
        errors.push(
          err("VALUE_OUT_OF_RANGE", `${fieldName}の値が不正です: ${token}`)
        )
        continue
      }
      const nv = normalize(value, spec, dowStartsAt)
      if (nv < spec.min || nv > spec.max) {
        errors.push(
          err("VALUE_OUT_OF_RANGE", `${fieldName}の値が範囲外です: ${token}`)
        )
        continue
      }
      // "5/10" は "5-59/10" と解釈する
      base =
        stepRaw === undefined
          ? { kind: "value", value: nv }
          : { kind: "range", from: nv, to: spec.max }
    }

    if (stepRaw === undefined) {
      terms.push(base)
      continue
    }
    const step = Number(stepRaw)
    if (!Number.isInteger(step) || step < 1) {
      errors.push(
        err("VALUE_OUT_OF_RANGE", `${fieldName}のステップが不正です: ${token}`)
      )
      continue
    }
    terms.push({ kind: "step", base, step })
  }

  if (terms.length === 0) terms.push({ kind: "all" })

  const isAll = terms.length === 1 && terms[0]?.kind === "all"
  return { terms, values: expand(terms, spec), isAll }
}

export function parseExpression(
  expression: string,
  fields: FieldCount,
  dowStartsAt: 0 | 1
): ParseOutcome {
  const errors: CronError[] = []
  const parts = expression.trim().split(/\s+/).filter(Boolean)

  if (parts.length !== fields) {
    return {
      schedule: null,
      errors: [
        err(
          "FIELD_COUNT_MISMATCH",
          `${fields}個のフィールドを期待しましたが、${parts.length}個でした`
        )
      ]
    }
  }

  const offset = fields === 6 ? 1 : 0
  const at = (i: number): string => parts[i] ?? "*"

  const schedule: Schedule = {
    ...(fields === 6
      ? {
          second: parseField(at(0), SPECS.second, "秒", dowStartsAt, errors)
        }
      : {}),
    minute: parseField(at(offset), SPECS.minute, "分", dowStartsAt, errors),
    hour: parseField(at(offset + 1), SPECS.hour, "時", dowStartsAt, errors),
    dayOfMonth: parseField(
      at(offset + 2),
      SPECS.dayOfMonth,
      "日",
      dowStartsAt,
      errors
    ),
    month: parseField(at(offset + 3), SPECS.month, "月", dowStartsAt, errors),
    dayOfWeek: parseField(
      at(offset + 4),
      SPECS.dayOfWeek,
      "曜日",
      dowStartsAt,
      errors
    ),
    tz: null
  }

  return { schedule: errors.length > 0 ? null : schedule, errors }
}
