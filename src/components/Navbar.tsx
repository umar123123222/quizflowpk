import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  return (
    <nav
      className="fixed top-0 z-50 w-full backdrop-blur-md"
      style={{ backgroundColor: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo size="lg" linkTo="/" />

        <div className="hidden items-center gap-8 md:flex">
          {["Features", "Pricing", "Templates"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium transition-colors"
              style={{ color: 'rgba(232,227,213,0.6)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F59E0B')}
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
            style={{ backgroundColor: '#F59E0B', color: '#0a0d14', borderRadius: '6px' }}
          >
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
