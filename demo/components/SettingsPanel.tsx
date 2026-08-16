import type { Settings } from "../hooks/useSettings"
import { Field } from "./Field"

type Props = {
  settings: Settings
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

/** 既定では畳んでおき、触りたい人だけ開く */
export function SettingsPanel({ settings, onChange }: Props) {
  return (
    <details class="mx-auto mt-10 max-w-[34rem] rounded-[10px] border border-line text-left text-[0.85rem] open:[&>summary]:border-b open:[&>summary]:border-line">
      <summary class="cursor-pointer list-none px-4 py-2 text-muted before:content-['⚙_'] hover:text-fg">
        設定
      </summary>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-x-5 gap-y-3 p-4">
        <Field
          name="style.hourFormat"
          value={settings.hourFormat}
          options={[
            { value: "24h", label: '"24h"' },
            { value: "12h", label: '"12h"' }
          ]}
          onChange={v => onChange("hourFormat", v as Settings["hourFormat"])}
        />
        <Field
          name="style.zeroMinute"
          value={settings.zeroMinute}
          options={[
            { value: "keep", label: '"keep"' },
            { value: "omit", label: '"omit"' }
          ]}
          onChange={v => onChange("zeroMinute", v as Settings["zeroMinute"])}
        />
        <Field
          name="style.rangeStyle"
          value={settings.rangeStyle}
          options={[
            { value: "auto", label: "未指定" },
            { value: "wave", label: '"wave"' },
            { value: "kara", label: '"kara"' }
          ]}
          onChange={v => onChange("rangeStyle", v as Settings["rangeStyle"])}
        />
        <Field
          name="style.foldWeekdays"
          value={String(settings.foldWeekdays)}
          options={[
            { value: "true", label: "true" },
            { value: "false", label: "false" }
          ]}
          onChange={v => onChange("foldWeekdays", v === "true")}
        />
        <Field
          name="fields"
          value={String(settings.fields)}
          options={[
            { value: "5", label: "5" },
            { value: "6", label: "6" }
          ]}
          onChange={v => onChange("fields", Number(v) as 5 | 6)}
        />
        <Field
          name="timeZone"
          value={settings.toJst ? "jst" : "none"}
          options={[
            { value: "none", label: "未指定" },
            { value: "jst", label: '"Asia/Tokyo"（UTC から）' }
          ]}
          onChange={v => onChange("toJst", v === "jst")}
        />
      </div>
    </details>
  )
}
