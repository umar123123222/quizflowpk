import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-1.5">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold font-display">QuizFlow</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Templates</a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">Log in</Button>
          <Button size="sm">Sign up</Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
