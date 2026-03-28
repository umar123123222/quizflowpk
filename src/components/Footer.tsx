import { Logo } from "@/components/Logo";

const Footer = () => {
  return (
    <footer className="py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Logo size="sm" />
          <p className="text-sm" style={{ color: 'rgba(232,227,213,0.4)' }}>
            © 2026 QuizFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
