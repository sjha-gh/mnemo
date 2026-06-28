import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolved: "light" | "dark"
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to dark for the premium, focused mood. No persistence (mock-first).
  const [theme, setTheme] = useState<Theme>("dark")

  const resolved: "light" | "dark" = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolved === "dark")
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#0c0c0d" : "#f7f4ef")
  }, [resolved])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolved,
      setTheme,
      toggle: () => setTheme(resolved === "dark" ? "light" : "dark"),
    }),
    [theme, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
