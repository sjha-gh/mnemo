import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import { ThemeProvider } from "./context/theme-context"
import { UIProvider } from "./context/ui-context"
import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <UIProvider>
            <App />
          </UIProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

// Register the PWA service worker for installability + offline shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration errors in unsupported environments */
    })
  })
}
