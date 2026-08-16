# cronyome

## 0.1.1

### Patch Changes

- [`d93f02f`](https://github.com/nacal/cronyome/commit/d93f02fa6a1e6a9ca28bfe41402e054e9bf00d66) Thanks [@nacal](https://github.com/nacal)! - README に npm バージョンのバッジを追加する。ライブラリの挙動に変更はない。

## 0.1.0

### Minor Changes

- [`1caa63c`](https://github.com/nacal/cronyome/commit/1caa63cb213bf537d31832200b70b44c13711e83) Thanks [@nacal](https://github.com/nacal)! - 最初のリリース。cron 式を自然な日本語に変換する `describe` と `createDescriber` を公開する。
  
  - 範囲や間隔を列挙に潰さず、`9-17` は「9〜17時」のまま読む
  - 制約されているフィールドを説明から落とさない（不変条件 I8 が全式で検査する）
  - 表記の規約は `createDescriber` で 1 回だけ決める。グローバル設定は持たない
  - フォーマット文字列とトークンで文言をアプリ側に寄せられる
  - タイムゾーン変換に対応する。安全に書き換えられない式は変換せず `tzShifted: false` を返す
