import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/context/theme-context"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {resolved === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  )
}
