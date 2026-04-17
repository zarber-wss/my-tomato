"use client"

import { Fragment } from "react"
import { cn } from "@/lib/utils"

type Segment =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; label: string }

/** 仅允许 http(s)，避免 javascript: 等协议 */
function toSafeHttpHref(raw: string): string | null {
  let candidate = raw.replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
  for (let i = 0; i < 10 && candidate.length > 0; i++) {
    try {
      const u = new URL(candidate)
      if (u.protocol === "http:" || u.protocol === "https:") return u.href
    } catch {
      // ignore
    }
    if (/[.,;:!?)]$/.test(candidate)) candidate = candidate.slice(0, -1)
    else break
  }
  return null
}

function segmentNoteText(text: string): Segment[] {
  const re = /(https?:\/\/[^\s]+)/gi
  const out: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: "text", value: text.slice(last, m.index) })
    const raw = m[0]
    const href = toSafeHttpHref(raw)
    if (href) out.push({ kind: "link", href, label: raw })
    else out.push({ kind: "text", value: raw })
    last = m.index + raw.length
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) })
  return out
}

export function LinkifiedText({
  text,
  linkClassName,
}: {
  text: string
  /** 追加在链接上的类名（如与父级文字色一致） */
  linkClassName?: string
}) {
  const segments = segmentNoteText(text)
  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === "link" ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "underline decoration-current/45 underline-offset-[3px] hover:decoration-current/80",
              linkClassName
            )}
          >
            {seg.label}
          </a>
        ) : (
          <Fragment key={i}>{seg.value}</Fragment>
        )
      )}
    </>
  )
}
