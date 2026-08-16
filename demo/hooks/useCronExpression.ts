import { flushSync, useEffect, useState } from "hono/jsx/dom"
import { readHash, writeHash } from "../utils/expressionHash"
import { randomExpression } from "../utils/randomExpression"
import { reduceMotion } from "./useTheme"

/**
 * 出力欄をふわっと入れ替える。文字が変わった「後」に呼ぶ必要がある。
 * short → long の順に少しずらして、視線が上から下へ流れるようにする
 */
function animateOutput(): void {
  if (reduceMotion()) return
  for (const [id, delay] of [
    ["short", 0],
    ["long", 70]
  ] as const) {
    document.getElementById(id)?.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" }
      ],
      {
        duration: 260,
        delay,
        easing: "cubic-bezier(.2, .7, .3, 1)",
        // delay 中に元の文字が見えないよう、開始時の状態を先に当てる
        fill: "backwards"
      }
    )
  }
}

export function useCronExpression() {
  const [expression, setExpression] = useState(readHash)

  useEffect(() => writeHash(expression), [expression])

  // 状態の反映は非同期なので、flushSync で DOM を更新してからアニメーションを当てる。
  // そうしないと「変わる前の文字」がアニメーションしてしまう
  const replace = (next: string) => {
    flushSync(() => setExpression(next))
    animateOutput()
  }

  // 戻る / 進む、および URL を直接開いた場合に追従する
  useEffect(() => {
    const onHashChange = () => replace(readHash())
    addEventListener("hashchange", onHashChange)
    return () => removeEventListener("hashchange", onHashChange)
  }, [])

  return {
    expression,
    /** 手入力。アニメーションは付けない（打鍵ごとに動くと煩わしい） */
    setExpression,
    /** ランダム入力や履歴移動。アニメーションを伴う */
    replace,
    randomize: () => replace(randomExpression())
  }
}
