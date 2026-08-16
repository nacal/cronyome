import type { TokenName } from "./index"
import type { Segments } from "./ja"

const TOKEN_NAMES: TokenName[] = [
  "scope",
  "freq",
  "month",
  "dom",
  "dow",
  "dowLong",
  "time",
  "timeLong",
  "hour",
  "minute",
  "second"
]

const SEPARATORS = [" ", "の", "・", "、", ":", "　"]

export type FormatNode =
  | { kind: "literal"; text: string }
  | { kind: "token"; name: TokenName }
  | { kind: "optional"; children: FormatNode[] }

export class FormatError extends Error {}

/** 設定の誤りはプログラマのミスなので例外で落とす */
export function parseFormat(source: string): FormatNode[] {
  const stack: FormatNode[][] = [[]]
  let literal = ""
  let i = 0

  const flush = (): void => {
    if (literal !== "") {
      stack[stack.length - 1]?.push({ kind: "literal", text: literal })
      literal = ""
    }
  }

  while (i < source.length) {
    const c = source[i] ?? ""
    if (c === "\\") {
      literal += source[i + 1] ?? ""
      i += 2
      continue
    }
    if (c === "[") {
      flush()
      stack.push([])
      i++
      continue
    }
    if (c === "]") {
      flush()
      const children = stack.pop()
      if (!children || stack.length === 0) {
        throw new FormatError(`省略グループの対応が取れていません: ${source}`)
      }
      stack[stack.length - 1]?.push({ kind: "optional", children })
      i++
      continue
    }
    if (c === "{") {
      const end = source.indexOf("}", i)
      if (end === -1)
        throw new FormatError(`トークンが閉じられていません: ${source}`)
      const name = source.slice(i + 1, end)
      if (name.includes(":")) {
        throw new FormatError(
          `トークンの引数は使えません: {${name}}。長さの違いは {dowLong} のような別トークンで指定してください`
        )
      }
      if (!TOKEN_NAMES.includes(name as TokenName)) {
        throw new FormatError(`未知のトークンです: {${name}}`)
      }
      flush()
      stack[stack.length - 1]?.push({ kind: "token", name: name as TokenName })
      i = end + 1
      continue
    }
    literal += c
    i++
  }

  flush()
  if (stack.length !== 1)
    throw new FormatError(`省略グループが閉じられていません: ${source}`)
  return stack[0] ?? []
}

function trimSeparators(text: string): string {
  let out = text
  let changed = true
  while (changed) {
    changed = false
    for (const sep of SEPARATORS) {
      if (out.startsWith(sep)) {
        out = out.slice(sep.length)
        changed = true
      }
      if (out.endsWith(sep)) {
        out = out.slice(0, -sep.length)
        changed = true
      }
    }
  }
  return out
}

type Chunk = { text: string; separator: boolean }

const isSeparatorOnly = (text: string): boolean =>
  text.length > 0 && [...text].every(ch => SEPARATORS.includes(ch))

function collect(
  nodes: FormatNode[],
  segments: Segments
): { chunks: Chunk[]; filled: boolean } {
  const chunks: Chunk[] = []
  let filled = false
  let hasToken = false

  for (const node of nodes) {
    if (node.kind === "literal") {
      chunks.push({ text: node.text, separator: isSeparatorOnly(node.text) })
    } else if (node.kind === "token") {
      hasToken = true
      const value = segments[node.name]
      if (value !== "") filled = true
      chunks.push({ text: value, separator: false })
    } else {
      hasToken = true
      const inner = collect(node.children, segments)
      // 中身が全て空のグループは、リテラルごと消える
      if (inner.filled) {
        filled = true
        chunks.push(...inner.chunks)
      }
    }
  }

  return { chunks, filled: hasToken ? filled : true }
}

export function render(nodes: FormatNode[], segments: Segments): string {
  const { chunks } = collect(nodes, segments)

  // 区切り文字だけのリテラルは、前か後ろに内容が無ければ落とす。
  // グループ単位で機械的にトリムすると "[{dowLong}の]" の「の」まで消えてしまうため、
  // 平坦化したうえで前後関係を見る。
  const kept = chunks.map((chunk, i) => {
    if (!chunk.separator) return chunk
    const preceding = chunks
      .slice(0, i)
      .filter(c => !c.separator && c.text !== "")
    const after = chunks.slice(i + 1).some(c => !c.separator && c.text !== "")
    if (preceding.length === 0 || !after) return { ...chunk, text: "" }
    // 「12月の」のように助詞で終わっている直後に、空白や「の」を重ねない
    const endsWithParticle =
      preceding[preceding.length - 1]?.text.endsWith("の") ?? false
    if (endsWithParticle && (chunk.text.trim() === "" || chunk.text === "の")) {
      return { ...chunk, text: "" }
    }
    return chunk
  })

  return trimSeparators(
    kept
      .map(c => c.text)
      .join("")
      .replace(/\s+/g, " ")
  )
}
