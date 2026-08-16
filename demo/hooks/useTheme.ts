import { useEffect, useState } from "hono/jsx/dom"

export type Theme = "light" | "dark"

const KEY = "theme"

export const reduceMotion = (): boolean =>
  matchMedia("(prefers-reduced-motion: reduce)").matches

const systemTheme = (): Theme =>
  matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

const readTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === "light" || saved === "dark") return saved
  } catch {
    // プライベートモード等で読めない場合は OS の設定に従う
  }
  return systemTheme()
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // 保存できなくても表示は成立する
    }
  }, [theme])

  /**
   * startViewTransition のコールバックは同期的に DOM を変える必要があるので、
   * data-theme を直接書き換えてから状態も更新する。状態の反映を待つと、
   * 切り替え前の画面が撮影されてしまう
   */
  const toggle = (): void => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    if (!document.startViewTransition || reduceMotion()) {
      setTheme(next)
      return
    }
    document.startViewTransition(() => {
      document.documentElement.dataset.theme = next
      setTheme(next)
    })
  }

  return { theme, toggle }
}
