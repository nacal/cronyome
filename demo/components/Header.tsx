import type { Theme } from "../hooks/useTheme"
import { GitHubIcon, MoonIcon, SunIcon } from "./Icons"

type Props = {
  theme: Theme
  onToggleTheme: () => void
}

/** ボタンとリンクは見た目を揃えるので、クラスも 1 か所で持つ */
const buttonClass =
  "grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-line hover:text-fg [&_svg]:size-[1.15rem] [&_svg]:fill-current"

export function Header({ theme, onToggleTheme }: Props) {
  const label = theme === "dark" ? "ライトモードにする" : "ダークモードにする"

  return (
    // ロゴの帯（z-5）より前に出す。これが無いと帯に隠れる
    <div class="fixed top-4 right-4 z-10 flex gap-1">
      <button
        type="button"
        class={buttonClass}
        onClick={onToggleTheme}
        aria-label={label}
        title={label}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
      <a
        href="https://github.com/nacal/cronyome"
        target="_blank"
        rel="noopener noreferrer"
        class={buttonClass}
        aria-label="GitHub リポジトリ（新しいタブで開く）"
        title="GitHub"
      >
        <GitHubIcon />
      </a>
    </div>
  )
}
