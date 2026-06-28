"use client"

import { Bold, Italic, List, ListOrdered, Heading2, Quote, Code } from "lucide-react"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

type Command = {
  icon: typeof Bold
  label: string
  run: () => void
}

export function RichTextEditor({
  html,
  onChange,
  placeholder = "Start writing with rich formatting…",
}: {
  html: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  // Sync external html into the contentEditable only when it differs,
  // to avoid clobbering the caret while typing.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [html])

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value)
    if (ref.current) onChange(ref.current.innerHTML)
    ref.current?.focus()
  }

  const commands: Command[] = [
    { icon: Heading2, label: "Heading", run: () => exec("formatBlock", "<h2>") },
    { icon: Bold, label: "Bold", run: () => exec("bold") },
    { icon: Italic, label: "Italic", run: () => exec("italic") },
    { icon: List, label: "Bullet list", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", run: () => exec("insertOrderedList") },
    { icon: Quote, label: "Quote", run: () => exec("formatBlock", "<blockquote>") },
    { icon: Code, label: "Code block", run: () => exec("formatBlock", "<pre>") },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 -mx-1 mb-2 flex flex-wrap items-center gap-0.5 border-b border-border bg-background/80 px-1 py-1.5 backdrop-blur">
        {commands.map((cmd) => (
          <button
            key={cmd.label}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              cmd.run()
            }}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={cmd.label}
            title={cmd.label}
          >
            <cmd.icon className="size-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Note body"
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className={cn(
          "prose-note min-h-[50vh] flex-1 rounded-lg px-0.5 py-2 text-[17px] leading-[1.75] text-foreground outline-none",
          "empty:before:pointer-events-none empty:before:text-muted-foreground/40 empty:before:content-[attr(data-placeholder)] empty:before:italic",
          "focus:outline-none focus:ring-0",
        )}
      />
    </div>
  )
}
