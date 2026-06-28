import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { Check, Info, TriangleAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastTone = "default" | "success" | "warning"
interface Toast {
  id: number
  message: string
  tone: ToastTone
}

interface UIContextValue {
  toast: (message: string, tone?: ToastTone) => void
}

const UIContext = createContext<UIContextValue | null>(null)

let counter = 0

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = "default") => {
      const id = ++counter
      setToasts((t) => [...t, { id, message, tone }])
      window.setTimeout(() => dismiss(id), 3200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <UIContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:pb-6">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? Check : t.tone === "warning" ? TriangleAlert : Info
          return (
            <div
              key={t.id}
              role="status"
              className="animate-fade-up pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-popover/95 px-4 py-3 text-sm text-popover-foreground shadow-lg backdrop-blur"
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  t.tone === "success" && "text-primary",
                  t.tone === "warning" && "text-destructive",
                  t.tone === "default" && "text-muted-foreground",
                )}
              />
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error("useUI must be used within UIProvider")
  return ctx
}
