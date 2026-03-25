import { Zap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-display">QuizFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 QuizFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
