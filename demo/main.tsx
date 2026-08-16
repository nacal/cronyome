import { render } from "hono/jsx/dom"
import "./style.css"
import logoUrl from "../logo.svg"
// ライブラリのソースを直接読む。ビルド済みの成果物を経由しないので、
// src を直せば保存した瞬間にデモへ反映される
import { createDescriber } from "../src/index"
import { Header } from "./components/Header"
import { SettingsPanel } from "./components/SettingsPanel"
import { useCronExpression } from "./hooks/useCronExpression"
import { describerOptions, useSettings } from "./hooks/useSettings"
import { useTheme } from "./hooks/useTheme"

/** エラーと注記で色だけ変える。枠と余白は共通 */
const messageClass =
  "mx-auto mt-6 rounded-lg border-l-[3px] px-4 py-3 text-left text-[0.92rem] [&_code]:font-mono [&_code]:text-[0.85em]"

function App() {
  const { theme, toggle } = useTheme()
  const { settings, set } = useSettings()
  const { expression, setExpression, randomize } = useCronExpression()

  const result = createDescriber(describerOptions(settings)).describe(
    expression
  )
  const failed = result.errors.length > 0

  return (
    <>
      <Header theme={theme} onToggleTheme={toggle} />

      {/* 画面上部に固定する。出力が伸びてスクロールしても居座るので、
          下をスクロールした内容が透けないよう bg-bg で覆う */}
      <div class="fixed inset-x-0 top-0 z-5 grid justify-items-center bg-bg px-4 pt-[clamp(1.5rem,6vh,3rem)] pb-5">
        <img
          class="block h-auto w-[min(15rem,55%)]"
          src={logoUrl}
          alt="cronyome"
          width="1024"
          height="168"
        />
      </div>

      {/* 入力欄まで本文の幅に広げると cron 式が間延びするので、ここだけ抑える */}
      <input
        class="mx-auto block w-full max-w-[42rem] rounded-[10px] border-2 border-line bg-bg px-3 py-[0.6rem] text-center font-mono text-[clamp(1.5rem,6vw,2.4rem)] tracking-[0.08em] text-fg focus:border-accent focus:outline-none"
        value={expression}
        spellcheck={false}
        autocomplete="off"
        aria-label="cron 式"
        onInput={e => setExpression((e.target as HTMLInputElement).value)}
      />
      <p class="mt-[0.8rem] text-[0.85rem]">
        <button
          type="button"
          class="cursor-pointer px-1 py-[0.2rem] text-muted hover:text-fg hover:underline"
          onClick={randomize}
        >
          ランダム入力
        </button>
      </p>

      <p class="mt-8 mb-[0.4rem] text-[clamp(1.3rem,5vw,2rem)] font-semibold [overflow-wrap:anywhere]">
        {result.short}
      </p>
      <p class="text-muted">{failed ? "" : result.long}</p>

      <SettingsPanel settings={settings} onChange={set} />

      {/* 変換できなかったことの注記。エラーではないので色を分ける */}
      {settings.toJst && !result.tzShifted && !failed && (
        <div
          class={`${messageClass} border-l-muted bg-[color-mix(in_srgb,var(--color-muted)_12%,transparent)] text-fg`}
        >
          この式はタイムゾーンを変換していません（
          <code>tzShifted: false</code>
          ）。変換すると日をまたぐため、日付の指定を安全に書き換えられないと判断しました。表示は元のタイムゾーンのままです。
        </div>
      )}
      {result.errors.map(e => (
        <div class={`${messageClass} border-l-err bg-err-bg`} key={e.code}>
          {e.message}
        </div>
      ))}
    </>
  )
}

const root = document.getElementById("root")
if (root) render(<App />, root)
