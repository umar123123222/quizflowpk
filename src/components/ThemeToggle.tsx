import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  variant?: "dashboard" | "landing";
}

const ThemeToggle = ({ variant = "dashboard" }: ThemeToggleProps) => {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);

  if (variant === "landing") {
    return (
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-mono tracking-[0.12em] uppercase transition-colors"
        style={{
          borderColor: isDark ? "rgba(232,227,213,0.15)" : "#d0d4de",
          color: isDark ? "rgba(232,227,213,0.6)" : "#6b7494",
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#e09615";
          e.currentTarget.style.color = "#e09615";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isDark ? "rgba(232,227,213,0.15)" : "#d0d4de";
          e.currentTarget.style.color = isDark ? "rgba(232,227,213,0.6)" : "#6b7494";
        }}
      >
        {isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
        {isDark ? "Light mode" : "Dark mode"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] px-3 py-1 font-mono text-[10px] tracking-[0.12em] uppercase text-[hsl(var(--dashboard-text)/.5)] transition-colors hover:text-[hsl(var(--dashboard-gold))] hover:border-[hsl(var(--dashboard-gold))/0.3]"
    >
      {isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
};

export default ThemeToggle;
