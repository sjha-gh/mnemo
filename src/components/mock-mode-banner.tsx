import { useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";
import { getApiMode, subscribeApiMode } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Surfaces when the app silently fell back to in-memory mock data because a
 * Vercel Function request failed. Hidden during normal ("live") operation, so
 * it stays out of the way until something is actually misconfigured.
 */
export function MockModeBanner({ className }: { className?: string }) {
  const mode = useSyncExternalStore(subscribeApiMode, getApiMode, getApiMode);

  if (mode !== "mock") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-[12px] font-medium text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <CloudOff className="size-3.5 shrink-0" />
      <span>
        Running in mock mode — showing local demo data, not your Aurora notes.
        Check the backend connection.
      </span>
    </div>
  );
}
