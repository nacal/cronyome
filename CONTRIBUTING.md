# CONTRIBUTING

ドキュメント・テスト・コメントは日本語で書く。**生成される文言そのものが仕様**なので、
仕様と実装を同じ言語に置いておかないとレビューが成り立たないため。
公開 API の識別子・型名・エラーコードは英語のまま揃える。

英語の issue や PR は歓迎する（English issues and PRs are welcome）。

## セットアップ

```bash
pnpm install
pnpm verify        # lint / typecheck / test / build / 配布形式 / サイズ
```

`pnpm verify` が通れば、CI も通る。

| コマンド | 内容 |
|---|---|
| `pnpm test` | テスト |
| `pnpm test:watch` | 変更を監視 |
| `pnpm typecheck` | ライブラリとデモの両方 |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm build` | `dist/` を生成 |
| `pnpm demo` | デモの開発サーバー。`src/` を直接読むので保存で即反映 |

### OG 画像を作り直す

`demo/public/ogp.png` は文字を焼き込んだ画像なので、文言を変えたら再生成する。
元データは `demo/ogp.html`。

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --user-data-dir="$(mktemp -d)" --allow-file-access-from-files \
  --window-size=1200,630 \
  --screenshot="$PWD/demo/public/ogp.png" \
  "file://$PWD/demo/ogp.html"
```

Chrome は撮影後もプロセスが残ることがあるので、終わらなければ中断してよい。
画像は書き出されている。

### スタイル

デモの見た目は Tailwind v4 で書く。色とフォントは `demo/style.css` の `@theme` に集約してあり、
`light-dark()` で light / dark 両方の値を 1 か所に持つ。`bg-bg` `text-fg` のように 1 語で書けるので、
`dark:` バリアントは使わない。

---

## 出力の文言を変える

このライブラリの成果物は日本語の文字列なので、**文言そのものが仕様**である。変更するときは 3 か所を揃える。

1. `src/ja.ts` を直す
2. `test/corpus/cases.ts` の期待値を直す
3. `README.md` の「出力例」テーブルを直す（`test/meta/docs.test.ts` が検証している）

期待値は思い込みで書かず、実装を動かして確かめる。

```bash
pnpm build && node -e "import('./dist/index.mjs').then(({describe}) => console.log(describe('0 3 * 1 *').short))"
```

---

## テストケースを足す

`test/corpus/cases.ts` にエントリを 1 つ足す。

```ts
{
  // 何を確かめるケースなのか、非自明なら 1 行書く
  expr: "0 3 * 1 *",
  short: "1月の毎日 3:00",        // 一覧向けの短い形
  long: "1月の毎日3時00分に実行",   // 詳細向けの文章形
  tags: ["scope:used", "freq:daily", "time:fixed", "tz:none"]
}
```

`fields: 6`（秒つき）や `tz: { from: "UTC", to: "Asia/Tokyo" }` を足すと、その設定の describer で検証される。

**新しい規則を検証するなら、タグを 2 か所に登録する。**

- `test/corpus/cases.ts` の `Tag` 型
- `test/meta/coverage.test.ts` の `REQUIRED_TAGS`

登録した規則にケースが無いと `meta/coverage` が落ちる。書き忘れを人の注意力に任せないための仕掛けなので、外さないこと。

---

## 不変条件を足す

`test/invariants/invariants.test.ts` の配列に述語を足すと、手書きケースと機械生成コーパスの**全式**に適用される。

```ts
{
  id: "I8",
  name: "制約されているフィールドは説明に必ず現れる",
  check: (r, s) => {
    // r … DescribeResult（parts / short / long など）
    // s … トークンごとの文字列（{freq} や {dom} の中身）
    if (r.parts.hour !== undefined && !/時|:/.test(s.time)) return false
    return true
  }
}
```

**同じ形のバグが 2 回出たら、ケースを増やすのではなく述語にする。** 実際、I8 は「時の制約が説明から消える」バグを 5 回踏んでから書いた。書いた直後に 6 件目が落ちた。

---

## 注意

**周期語を返す分岐で、他フィールドの制約を確認せずに早期リターンしない。**

```ts
// 悪い例：時が 9-17 に制限されていても「5分ごと」としか言わない
if (minStep !== null) return `${minStep}分ごと`
```

これがこのライブラリで最も多いバグである。出力は自然な日本語のままなので、読んでも気づけない。`hourScope()` のような限定句を必ず前置する。

**`Date.now()` を使わない。** 基準日時は `REFERENCE_DATE`（2027-01-15）に固定してある。現在時刻に依存すると、テストが年をまたいで壊れ、SSR ではハイドレーション不一致になる。

**スナップショット（`.snap`）を追加しない。** 文言が仕様なので、変更は手で書き換える。

**実行時依存を増やさない。** `dependencies` は空である。ビルドやテストに使うものは `devDependencies` に入れる。

---

## Pull Request

挙動や文言が変わる変更には、changeset を添える。

```bash
pnpm changeset      # 変更の種類（patch / minor / major）と説明を書く
```

生成された `.changeset/*.md` をコミットに含める。バージョンの決定と公開はメンテナが行う。

---

## AI コーディングエージェントを使う場合

`AGENTS.md` にエージェント向けの指示がある。Claude Code、Cursor、Codex などはこれを自動で読む。
