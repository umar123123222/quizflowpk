import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useState, useEffect } from "react";

const Navbar = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="fixed top-0 z-50 w-full backdrop-blur-md"
      style={{
        backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.95)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e4e8f0',
      }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo size="lg" linkTo="/" variant={isDark ? "dark" : "light"} />

        <div className="hidden items-center gap-8 md:flex">
          {["Features", "Pricing", "Templates"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium transition-colors"
              style={{ color: isDark ? 'rgba(232,227,213,0.6)' : '#6b7494' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e09615')}
              onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? 'rgba(232,227,213,0.6)' : '#6b7494')}
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="landing" />
          <Button variant="ghost" size="sm" asChild className="font-medium" style={{ color: isDark ? 'rgba(232,227,213,0.5)' : '#6b7494' }}>
            <Link to="/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="font-medium border-0"
            style={{ backgroundColor: '#e09615', color: '#ffffff', borderRadius: '6px' }}
          >
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
