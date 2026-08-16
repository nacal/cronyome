type Props = {
  /** API 上の名前をそのまま出す。触りながらコードに写せるように */
  name: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

export function Field({ name, value, options, onChange }: Props) {
  return (
    <label class="grid gap-1 text-muted">
      <code class="font-mono text-[0.78rem]">{name}</code>
      <select
        value={value}
        class="rounded-md border border-line bg-bg px-2 py-1 font-mono text-inherit text-fg"
        onChange={e => onChange((e.target as HTMLSelectElement).value)}
      >
        {options.map(o => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
