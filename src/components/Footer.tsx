import { Zap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="rounded-lg p-1.5" style={{ backgroundColor: '#e8c87a' }}>
              <Zap className="h-4 w-4" style={{ color: '#0a0d14' }} />
            </div>
            <span className="font-bold font-display" style={{ color: '#e8c87a' }}>QuizFlow</span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(232,227,213,0.4)' }}>
            © 2026 QuizFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
