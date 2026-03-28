import { Logo } from "@/components/Logo";
import { useState, useEffect } from "react";

const Footer = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="py-12" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e4e8f0' }}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Logo size="sm" variant={isDark ? "dark" : "light"} />
          <p className="text-sm" style={{ color: isDark ? 'rgba(232,227,213,0.4)' : '#6b7494' }}>
            © 2026 QuizFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
