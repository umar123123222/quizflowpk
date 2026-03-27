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
    <nav
      className="fixed top-0 z-50 w-full backdrop-blur-md"
      style={{ backgroundColor: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5" style={{ backgroundColor: '#e8c87a' }}>
            <Zap className="h-5 w-5" style={{ color: '#0a0d14' }} />
          </div>
          <span className="text-xl font-bold font-serif" style={{ color: '#e8c87a' }}>QuizFlow</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {["Features", "Pricing", "Templates"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium transition-colors"
              style={{ color: 'rgba(232,227,213,0.6)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e8c87a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(232,227,213,0.6)')}
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 36,
              height: 36,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'rgba(232,227,213,0.6)',
            }}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Button variant="ghost" size="sm" asChild className="font-medium" style={{ color: 'rgba(232,227,213,0.5)' }}>
            <Link to="/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="font-medium border-0"
            style={{ backgroundColor: '#e8c87a', color: '#0a0d14', borderRadius: '6px' }}
          >
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
