import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { Home, Plus, Search } from "lucide-react"
import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/app", label: "Notes", icon: Home },
  { to: "/search", label: "Search", icon: Search },
]

export function AppLayout() {
  const location = useLocation()
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)]">
          <Link to="/app" className="flex items-center" aria-label="Mnemo home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              to="/new"
              className="hidden items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 sm:inline-flex"
            >
              <Plus className="size-4" />
              New note
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:pb-12" key={location.pathname}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}

          <Link
            to="/new"
            aria-label="New note"
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-foreground"
          >
            <span className="grid size-10 -translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Plus className="size-5" />
            </span>
            <span className="-mt-2">New</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
