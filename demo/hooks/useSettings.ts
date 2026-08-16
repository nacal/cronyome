import { useEffect, useState } from "hono/jsx/dom"
import type { Style } from "../../src/index"

export type Settings = {
  fields: 5 | 6
  toJst: boolean
  hourFormat: NonNullable<Style["hourFormat"]>
  zeroMinute: NonNullable<Style["zeroMinute"]>
  foldWeekdays: boolean
  rangeStyle: "auto" | "wave" | "kara"
}

export const DEFAULT_SETTINGS: Settings = {
  fields: 5,
  toJst: false,
  hourFormat: "24h",
  zeroMinute: "keep",
  foldWeekdays: true,
  rangeStyle: "auto"
}

const KEY = "settings"

const readSettings = (): Settings => {
  try {
    const saved = localStorage.getItem(KEY)
    // 既定に重ねるので、保存済みの値が古い形でも壊れない
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
  } catch {
    // 読めなければ既定で始める
  }
  return DEFAULT_SETTINGS
}

const saveSettings = (settings: Settings): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // 保存できなくても表示は成立する
  }
}

/** 設定から createDescriber に渡す引数を組み立てる */
export const describerOptions = (s: Settings) => ({
  fields: s.fields,
  style: {
    hourFormat: s.hourFormat,
    zeroMinute: s.zeroMinute,
    foldWeekdays: s.foldWeekdays,
    ...(s.rangeStyle === "auto" ? {} : { rangeStyle: s.rangeStyle })
  },
  ...(s.toJst ? { sourceTimeZone: "UTC", timeZone: "Asia/Tokyo" } : {})
})

export function useSettings() {
  const [settings, setSettings] = useState(readSettings)

  useEffect(() => saveSettings(settings), [settings])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  return { settings, set }
}
