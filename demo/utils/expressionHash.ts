export const DEFAULT_EXPRESSION = "0 3 * * 1-5"

// crontab.guru と同じく、空白を "_" にして hash に載せる。
// "*" や "," はフラグメントにそのまま置ける
const toHash = (expression: string): string =>
  expression.trim().replace(/\s+/g, "_")

const fromHash = (hash: string): string =>
  decodeURIComponent(hash.replace(/^#/, "")).replace(/_/g, " ").trim()

export const readHash = (): string =>
  fromHash(location.hash) || DEFAULT_EXPRESSION

/** 履歴を汚さないよう replaceState を使う */
export const writeHash = (expression: string): void => {
  const next = `#${toHash(expression)}`
  if (location.hash !== next) history.replaceState(null, "", next)
}
