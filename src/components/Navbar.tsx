import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav
      className="fixed top-0 z-50 w-full backdrop-blur-md"
      style={{ backgroundColor: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5" style={{ backgroundColor: '#F59E0B' }}>
            <Zap className="h-5 w-5" style={{ color: '#0a0d14' }} />
          </div>
          <span className="text-xl font-bold font-serif" style={{ color: '#F59E0B' }}>QuizFlow</span>
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
