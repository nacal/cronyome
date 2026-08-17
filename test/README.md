# test

テストの書き方・足し方は [CONTRIBUTING.md](../CONTRIBUTING.md) を参照。

## テスト

| パス | 対象 | 検証すること |
|---|---|---|
| `integration/describe.test.ts` | cases | `short` / `long` / `errors` が期待どおりか |
| `invariants/invariants.test.ts` | cases + generated（5・6 フィールド） | I1〜I9 の性質を満たすか |
| `property/semantics.test.ts` | generated（5・6 フィールド） | `parts` が croner の実行時刻と矛盾しないか |
| `property/frequency.test.ts` | cases + generated（5・6 フィールド） | 説明が示す周期の上限を、実際の実行回数が超えていないか |
| `meta/coverage.test.ts` | cases | 規則とトークンの網羅、設定エラーで例外が出るか |
| `meta/docs.test.ts` | README.md | 出力例テーブルが実際の出力と一致するか |
| `fuzz/no-throw.test.ts` | ランダム入力 | `describe()` が投げないか |

## コーパス

| パス | 内容 |
|---|---|
| `corpus/cases.ts` | 手書きのケース表。**文字列の期待値を持つのはここだけ** |
| `corpus/generated.ts` | 各フィールドの代表値の直積。文字列は検証せず、不変条件と croner との照合にだけ使う。`generatedSixField` は秒つき（時刻軸だけの直積） |

`generated.ts` に期待文字列を書かないこと。読める大きさを超えて、仕様書としての価値を失う。

## ヘルパ

`support/harness.ts`

```ts
describerFor(c)                  // ケースの fields / tz から describer を作る
segmentsOf(describer, expr)      // トークンごとの文字列を取り出す
nextRuns(expr, 100)              // croner による次回実行時刻
countRunsInYear(expr, cap, 5)    // 基準年（2027 固定）の実行回数。cap で打ち切る
forCroner(expr, 5)               // croner が読めない "3/10" を "3-59/10" に展開する
annualUpperBound(text, parts)    // 説明文が示す年間実行回数の上限。null なら検査対象外
```

`segmentsOf` は内部 API を使わない。全トークンを `|` で並べたフォーマットを描画させ、分割して取り出している。

## 既知の穴

`frequency.test.ts` は「N分ごと」を含む説明を検査対象から外している（`annualUpperBound` が `null` を返す）。ステップ式の上限を正しく見積もる方法が未実装のため。同種のバグは I8・I9 が別経路で捕まえている。
