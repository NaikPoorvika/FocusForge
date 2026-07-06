import { useEffect } from "react";
import { useAppState, setState } from "@/lib/store";

export function ThemeManager() {
  const theme = useAppState((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);
  return null;
}

export function toggleTheme() {
  setState((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }));
}
