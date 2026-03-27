import { Zap, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const Navbar = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <nav className="fixed top-0 z-50 w-full backdrop-blur-md border-b border-[hsl(var(--homepage-nav-border))]" style={{ backgroundColor: 'transparent' }}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5 bg-[hsl(var(--homepage-gold))]">
            <Zap className="h-5 w-5 text-[hsl(var(--homepage-bg))]" />
          </div>
          <span className="text-xl font-bold font-serif text-[hsl(var(--homepage-gold))]">QuizFlow</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {["Features", "Pricing", "Templates"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium transition-colors text-[hsl(var(--homepage-nav-link))] hover:text-[hsl(var(--homepage-gold))]"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-full border border-[hsl(var(--homepage-nav-border))] bg-transparent text-[hsl(var(--homepage-nav-link))] transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Button variant="ghost" size="sm" asChild className="font-medium text-[hsl(var(--homepage-nav-link))]">
            <Link to="/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="font-medium border-0 rounded-md bg-[hsl(var(--homepage-gold))] text-[hsl(var(--homepage-bg))] hover:opacity-90"
          >
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
