import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { expect, it } from "vitest"
import { describe as describeCron } from "../../src/index"

// README の出力例を実際にパースして実出力と突き合わせる。

const README = readFileSync(
  fileURLToPath(new URL("../../README.md", import.meta.url)),
  "utf8"
)

type Row = { expr: string; short: string; long: string }

function parseOutputTable(markdown: string): Row[] {
  const section = markdown.split("## 出力例")[1]?.split("\n## ")[0] ?? ""

  return section
    .split("\n")
    .filter(line => line.startsWith("|"))
    .map(line =>
      line
        .split("|")
        .slice(1, -1)
        .map(cell => cell.trim())
    )
    .filter(cells => cells.length === 3 && cells[0]?.startsWith("`"))
    .map(cells => ({
      expr: (cells[0] ?? "").replace(/`/g, ""),
      short: cells[1] ?? "",
      long: cells[2] ?? ""
    }))
}

const rows = parseOutputTable(README)

it("README の出力例テーブルを読み取れる", () => {
  expect(rows.length).toBeGreaterThan(5)
})

it.each(rows)("README: $expr → $short", row => {
  const r = describeCron(row.expr)
  expect({ short: r.short, long: r.long }).toEqual({
    short: row.short,
    long: row.long
  })
})
