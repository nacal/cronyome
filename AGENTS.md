# AGENTS.md

cron 式を日本語に変換するライブラリ。実行時依存はゼロ、出力は日本語の文字列。

## コマンド

```bash
pnpm install
pnpm verify          # 完了前に必ず通す（lint / typecheck / test / build / publint / attw / size）
pnpm test
pnpm vitest run test/integration       # ファイル単位
pnpm vitest run -t "0 3 * 1 *"         # 名前で絞る
pnpm demo            # デモの開発サーバー
```

## 構成

| パス | 役割 |
|---|---|
| `src/parse.ts` | 文字列 → `Field`（`terms` と `values` の二重表現） |
| `src/tz.ts` | タイムゾーン変換と、値集合の `terms` への再圧縮 |
| `src/ja.ts` | **日本語の生成規則。文言を変えるのはここ** |
| `src/format.ts` | フォーマット文字列の解析と描画 |
| `src/index.ts` | 公開 API と組み立て |
| `test/` | `test/README.md` を参照 |
| `demo/` | Vite + hono/jsx + Tailwind のデモ。`demo/dist` は生成物 |

## 守ること

**制約を説明から落とさない。** このリポジトリで最も多いバグは、周期語を返す分岐が他フィールドの制約を確認せず早期リターンし、**もっともらしい嘘**になることである。

```ts
// 悪い例：時が 9-17 に制限されていても「5分ごと」としか言わない
if (minStep !== null) return `${minStep}分ごと`
```

出力は自然な日本語のままなので、目で読んでも気づけない。`src/ja.ts` を触ったら、`parts` に載っているフィールドが説明文に現れているかを必ず確かめる。不変条件 I8 がこれを検査している。

**文言を変えたら 3 か所を揃える。** `src/ja.ts` → `test/corpus/cases.ts` の期待値 → `README.md` の出力例テーブル。最後のものは `test/meta/docs.test.ts` が検証しているので、忘れると CI が落ちる。

**期待値を推測で書かない。** 実装を動かして確認する。

```bash
pnpm build && node -e "import('./dist/index.mjs').then(({describe}) => console.log(describe('0 3 * 1 *').short))"
```

**`Date.now()` を使わない。** 基準日時は `REFERENCE_DATE`（2027-01-15）固定。現在時刻に依存するとテストが年をまたいで壊れ、SSR ではハイドレーション不一致になる。

**スナップショット（`.snap`）を追加しない。** 文言が仕様なので、変更は手で書き換える。

**`dependencies` を増やさない。** 実行時依存はゼロを維持する。ツールは `devDependencies` へ。

**公開 API を勝手に増やさない。** トークン（`{freq}` など）と `Style` のオプションは意図的に絞ってある。増やす前に、既存のトークンの組み合わせで表現できないかを検討する。

## 設計上の決定（変更するときは理由を確認する）

| 決定 | 理由 |
|---|---|
| `describe()` は例外を投げない | 入力エラーは値で返す。UI が空欄になるより入力式を出すほうが害が小さい |
| `createDescriber()` は例外を投げる | 設定の誤りはプログラマのミスなので起動時に落とす |
| フィールド数を自動判定しない | 6 フィールドは秒先頭と年末尾が判別不能。黙って間違えるより明示エラー |
| 範囲は展開しない | `9-17` は「9〜17時」。列挙に潰すと読めなくなる |
| 「など」で省略しない | 情報が落ちて嘘になる |
| 区切りは 3 種 | `listSeparator`（語）/ `valueSeparator`（数値）/ `longSeparator`（文章形） |

## スタイル

- Biome（`@nacal-tools/biome-config`）。ダブルクォート、セミコロンなし
- コメントは現在の挙動と「なぜ」を書く。修正の経緯は commit へ
- ドキュメント・テスト・コメントは日本語で書く。生成される文言そのものが仕様であり、
  仕様と実装を同じ言語に置くため。公開 API の識別子・型名・エラーコードは英語
