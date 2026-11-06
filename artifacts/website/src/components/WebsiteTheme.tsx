import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useUser } from "@clerk/react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";

type ThemeContextValue = { dark: boolean; toggle: () => void };
const ThemeContext = createContext<ThemeContextValue>({ dark: false, toggle: () => undefined });
const ANONYMOUS_THEME_KEY = "stillwell.theme.anonymous";

function themeKey(userId?: string) {
  return userId ? `stillwell.theme.user.${userId}` : ANONYMOUS_THEME_KEY;
}

function systemTheme() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function WebsiteThemeProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const { user } = useUser();
  const userId = user?.id;
  const key = themeKey(userId);
  const [dark, setDark] = useState(systemTheme);

  useLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      setDark(saved === "dark" ? true : saved === "light" ? false : systemTheme());
    } catch {
      setDark(systemTheme());
    }
  }, [key]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => {
      try {
        if (window.localStorage.getItem(key) === null) setDark(media.matches);
      } catch {
        setDark(media.matches);
      }
    };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, [key]);

  // Radix dialogs render outside the app wrapper. Give those portals the same
  // tokens while this website theme is enabled, and restore the host on exit.
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const previousDark = root.classList.contains("dark");
    const previousScope = root.classList.contains("website-v2");
    root.classList.add("website-v2");
    root.classList.toggle("dark", dark);
    return () => {
      root.classList.toggle("dark", previousDark);
      root.classList.toggle("website-v2", previousScope);
    };
  }, [enabled, dark]);

  const value = useMemo<ThemeContextValue>(() => ({
    dark,
    toggle: () => setDark((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(key, next ? "dark" : "light");
      } catch {
        // Keep the in-memory preference when browser storage is unavailable.
      }
      return next;
    }),
  }), [dark, key]);

  return <ThemeContext.Provider value={value}>
    {enabled
      ? <div className={`website-theme-surface${dark ? " dark" : ""}`} data-theme={dark ? "dark" : "light"}>{children}</div>
      : children}
  </ThemeContext.Provider>;
}

export function ThemeToggle({ className = "", testId = "button-theme-toggle" }: { className?: string; testId?: string }) {
  const { dark, toggle } = useContext(ThemeContext);
  return <Button
    type="button"
    variant="ghost"
    size="sm"
    className={`theme-toggle ${className}`}
    onClick={toggle}
    aria-label="Dark mode"
    aria-pressed={dark}
    data-testid={testId}
  >
    {dark ? <Sun aria-hidden="true" size={16} /> : <Moon aria-hidden="true" size={16} />}
    <span>Dark mode</span>
  </Button>;
}
