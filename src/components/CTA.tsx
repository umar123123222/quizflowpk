import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
      <div className="container mx-auto px-4">
        <div
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl p-12 text-center md:p-16"
          style={{
            background: 'linear-gradient(135deg, #1a1d2e 0%, #0d1018 100%)',
            border: '1px solid rgba(245,158,11,0.15)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.05)' }} />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.05)' }} />

          <h2
            className="relative mb-4 text-3xl font-bold sm:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif", color: '#e8e3d5' }}
          >
            Ready to transform your quizzes?
          </h2>
          <p className="relative mb-8 text-lg" style={{ color: 'rgba(232,227,213,0.5)' }}>
            Join thousands of educators and creators already using QuizFlow.
            Start for free — no credit card required.
          </p>
          <Button
            asChild
            size="lg"
            className="relative text-base px-8 py-6 border-0 font-medium"
            style={{ backgroundColor: '#e8c87a', color: '#0a0d14', borderRadius: '8px' }}
          >
            <Link to="/signup">
              Get Started Free
              <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
