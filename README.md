<p align="center">
  <img src="https://raw.githubusercontent.com/nacal/cronyome/main/logo.svg" alt="cronyome" width="280">
</p>

<p align="center">
  cron 式を<b>自然な日本語</b>に変換するライブラリ
</p>

<p align="center">
  <a href="https://nacal.github.io/cronyome/"><b>デモを触る</b></a> ・
  <a href="#出力例">出力例</a> ・
  <a href="./CONTRIBUTING.md">開発</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cronyome"><img src="https://img.shields.io/npm/v/cronyome.svg" alt="npm version"></a>
  <a href="https://github.com/nacal/cronyome/actions/workflows/ci.yml"><img src="https://github.com/nacal/cronyome/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
</p>

```ts
import { describe } from 'cronyome';

describe('0 3 * * 1-5').short   // → "平日 3:00"
describe('0 3 * 1 *').short     // → "1月の毎日 3:00"
describe('0 9-17 * * *').short  // → "9〜17時の毎時0分"
```

<details>
<summary><b>For English speakers</b></summary>

cronyome turns cron expressions into natural **Japanese**. The generated wording *is* the
specification, so the docs, tests, and code comments are written in Japanese — keeping the
spec and the implementation in the same language is what makes the wording reviewable.

The public API, type names, and error codes are in English, so you can use the library
without reading Japanese. Issues and pull requests in English are welcome; the maintainers
are native Japanese speakers and will reply in English.

</details>

---

## インストール

```bash
npm install cronyome
```

ESM と CJS の両方に対応し、型定義を同梱しています。実行時の依存はありません。

---

## 使い方

### 手軽に使う

```ts
import { describe } from 'cronyome';

describe('0 3 * * 1').text   // → "毎週月曜 3:00"
```

### アプリで使う（推奨）

表記のスタイルはアプリで 1 回だけ決めます。

```ts
// lib/cron.ts
import { createDescriber } from 'cronyome';

export const cron = createDescriber({
  fields: 5,                  // 標準 cron。6 フィールド（秒付き）は 6 を指定
  timeZone: 'Asia/Tokyo',
  sourceTimeZone: 'UTC',
  style: {
    hourFormat: '24h',
    zeroMinute: 'omit',       // {timeLong} で「3時00分」→「3時」
    foldWeekdays: true,       // 1-5 → 「平日」
    listSeparator: '・',      // 語の区切り（曜日・日・月）
    valueSeparator: ', ',     // 数値の区切り（short の時刻・分）
    longSeparator: 'と',      // long の区切り
    rangeStyle: 'wave',       // 月〜金
    orConnective: 'または',
  },
});
```

呼び出し側はフォーマットだけ指定します。

```ts
cron.describe(expr).text                               // short 相当
cron.describe(expr, { format: 'long' }).text
cron.describe(expr, { format: '{dow} {time}' }).text   // インライン指定
```

**グローバル設定（`setDefaults()` のようなもの）は提供していません。** SSR でリクエスト間に設定が漏れる、テストが順序依存になる、間接依存のコードの出力を壊す、といった問題を避けるためです。

---

## 設定

`createDescriber` に渡すもの。

| 項目 | 型 | 既定 | 内容 |
|---|---|---|---|
| `fields` | `5 \| 6` | `5` | cron のフィールド数。`6` は先頭が秒 |
| `dowStartsAt` | `0 \| 1` | `0` | 曜日の基点。`1` は Quartz（1 = 日曜） |
| `sourceTimeZone` | `string` | `"UTC"` | cron 式が書かれているタイムゾーン |
| `timeZone` | `string` | — | 表示先のタイムゾーン。`sourceTimeZone` と両方指定したときだけ変換する |
| `referenceDate` | `Date` | 現在 | 夏時間のあるゾーンで、どの時点のオフセットを使うか |
| `style` | `Style` | — | 表記の規約（下表） |
| `formats` | `Record<string, string>` | — | 名前付きのカスタムフォーマット |

`style` の中身。

| 項目 | 型 | 既定 | 例 |
|---|---|---|---|
| `hourFormat` | `"24h" \| "12h"` | `"24h"` | `15:30` / `午後3:30` |
| `zeroMinute` | `"keep" \| "omit"` | `"keep"` | `3時00分` / `3時`（long のみ） |
| `foldWeekdays` | `boolean` | `true` | `1-5` を `平日` にまとめるか |
| `listSeparator` | `string` | `"・"` | 語の区切り。`月・水・金` |
| `valueSeparator` | `string` | `", "` | 数値の区切り。`3:00, 15:00` |
| `longSeparator` | `string` | `"と"` | long の区切り。`月曜日と金曜日` |
| `rangeStyle` | `"wave" \| "kara"` | 自動 | 指定すると short と long の両方がその形になる |
| `orConnective` | `string` | `"または"` | 日と曜日の複合時 |

`rangeStyle` を指定しない場合は、short が `月〜金`、long が `月曜日から金曜日まで` と、それぞれの形に自然なほうを使います。

---

## 戻り値

```ts
const r = cron.describe('0 3 * * 1-5');
```

| プロパティ | 型 | 内容 |
|---|---|---|
| `text` | `string` | `format` に応じた文字列。指定しなければ `short` と同じ |
| `short` | `string` | 一覧・テーブルセル向け。`平日 3:00` |
| `long` | `string` | 詳細画面向け。`平日の3時00分に実行` |
| `frequency` | `Frequency` | `weekly` `monthly` `everyNMinutes` など |
| `parts` | `Parts` | 制約されているフィールドの数値配列。`{ hour: [3], minute: [0], dayOfWeek: [1,2,3,4,5] }` |
| `errors` | `CronError[]` | 空でなければ解釈できていない。`text` は入力式のまま |
| `tzShifted` | `boolean` | タイムゾーン変換が実際に行われたか |

`parts` があるので、「頻度はバッジ、時刻は太字」といったレイアウトを、文字列を正規表現で切り刻まずに組めます。

---

## タイムゾーン

k8s の CronJob は `timeZone` 未指定なら UTC です。`0 3 * * *` をそのまま「3:00」と表示すると、日本のユーザーには誤情報になります。

```ts
const cron = createDescriber({ sourceTimeZone: 'UTC', timeZone: 'Asia/Tokyo' });

cron.describe('0 3 * * *').text    // → "毎日 12:00"
cron.describe('0 23 * * 1').text   // → "毎週火曜 8:00"   ← 日跨ぎで曜日もずれる
```

夏時間のあるゾーンでは、cron 式が特定の瞬間に紐づかないため説明が季節によって変わります。`referenceDate` で基準日時を指定できます。日本標準時（+9 固定）では発生しません。

変換できない式（日と曜日の両方が指定されていて日をまたぐ場合など）は、誤った時刻を出さないために**変換せずに返します**。`tzShifted` で判別できます。

---

## フォーマットとトークン

フォーマット文字列は、**日時フォーマット（`YYYY/MM/DD`）とは別物**です。cron のフィールドは `*`（毎〜）や集合（`1-5`）になりうるため、値が無いトークンは自動的に空になります。

### 省略グループ `[...]`

```
'[{dom}の]{time}'
```

`{dom}` が空なら **「の」ごと**消えます。これが無いと助詞が浮きます。

### トークン一覧

| トークン | 軸 | 例 |
|---|---|---|
| `{scope}` | 日付 | `1月の`（限定句） |
| `{freq}` | 日付 | `毎週` `毎月` `3日ごと` |
| `{month}` | 日付 | `1月` |
| `{dom}` | 日付 | `1日` `末日` |
| `{dow}` / `{dowLong}` | 日付 | `月` / `月曜日` |
| `{time}` / `{timeLong}` | 時刻 | `3:00` / `3時00分` |
| `{hour}` `{minute}` `{second}` | 時刻 | `3` `0` `30`（単一値のときのみ） |

**引数構文（`{dow:long}`）はありません。** 長さの違いは `{dowLong}` のような別トークンで表します。語彙が有限になるので、TS の補完が効き、タイポがコンパイルエラーになります。

### カスタム文言の登録

プロダクトの用語に合わせた文言を、初期化時に一元登録できます。

```ts
const cron = createDescriber({
  formats: {
    notice: '[{scope}][{freq}][{month}][{dom}][{dowLong}]の{timeLong}に自動実行されます',
  },
});

cron.describe('0 3 * * 1', { format: 'notice' }).text
// → "毎週月曜日の3時00分に自動実行されます"
```

---

## 出力例

| cron | short | long |
|---|---|---|
| `* * * * *` | 毎分 | 毎分実行 |
| `*/5 * * * *` | 5分ごと | 5分ごとに実行 |
| `3/5 * * * *` | 3分から5分ごと | 3分から5分ごとに実行 |
| `10-50/10 * * * *` | 10〜50分の10分ごと | 10〜50分の10分ごとに実行 |
| `0 * * * *` | 毎時0分 | 毎時0分に実行 |
| `30 3 * * *` | 毎日 3:30 | 毎日3時30分に実行 |
| `0 3 * * 1` | 毎週月曜 3:00 | 毎週月曜日の3時00分に実行 |
| `0 3 * * 1-5` | 平日 3:00 | 平日の3時00分に実行 |
| `0 9-17 * * *` | 9〜17時の毎時0分 | 9時から17時までの毎時0分に実行 |
| `*/5 9-17 * * *` | 9〜17時の5分ごと | 9時から17時までの5分ごとに実行 |
| `0 9-17/2 * * *` | 9〜17時の2時間ごとの0分 | 9時から17時までの2時間ごとの0分に実行 |
| `0 3 1 * *` | 毎月1日 3:00 | 毎月1日の3時00分に実行 |
| `0 3 1-7 * *` | 毎月1〜7日 3:00 | 毎月1〜7日の3時00分に実行 |
| `0 3 */3 * *` | 3日ごと 3:00 | 3日ごとの3時00分に実行 |
| `0 3 1 * 5` | 毎月1日または毎週金曜 3:00 | 毎月1日または毎週金曜日の3時00分に実行 |
| `0 0 1 1 *` | 毎年1月1日 0:00 | 毎年1月1日の0時00分に実行 |
| `0 3 * 1 *` | 1月の毎日 3:00 | 1月の毎日3時00分に実行 |
| `0 3 15 1,7 *` | 毎年1月・7月の15日 3:00 | 毎年1月・7月の15日の3時00分に実行 |

`0 3 * 1 *` に注目してください。この式は**1月中は毎日**動きます。「毎年1月」と説明すると年 1 回に読めてしまうため、cronyome は「1月の毎日」と出します。

---

## フィールド数は自動判定しません

6 フィールドの cron には「**秒が先頭**」（node-cron 系）と「**年が末尾**」の 2 方言があり、`0 0 12 * * 3` はどちらでも成立します。自動判定は静かに間違え、しかも全フィールドの意味が 1 つずつずれるので、出力は一見もっともらしくなります。

```ts
createDescriber({ fields: 5 })  // 既定。6 フィールドを渡すとエラー
createDescriber({ fields: 6 })  // 先頭を秒として解釈
```

秒の指定も説明に含めます。分や時の制約と重なるときは、限定句を前に置きます。

```ts
const cron = createDescriber({ fields: 6 })

cron.describe('*/30 * * * * *').short // → "30秒ごと"
cron.describe('*/30 5 * * * *').short // → "毎時5分の30秒ごと"
cron.describe('55 5 * * * *').short   // → "毎時5分55秒"
cron.describe('30 */5 * * * *').short // → "5分ごとの30秒"
```


---

## エラーの扱い

- **`describe()` は例外を投げません。** 解釈できない式でも `errors` に理由を入れ、`text` には入力式をそのまま返します（UI で空欄になるより害が小さいため）
- **`createDescriber()` は例外を投げます。** 設定やフォーマットの誤りはプログラマのミスなので、起動時に落とします

---

## ライセンス

MIT
