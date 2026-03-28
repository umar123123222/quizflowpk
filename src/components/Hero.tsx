import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-32 md:pt-40" style={{ paddingBottom: '4rem' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(232,200,122,0.03)' }} />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(74,158,255,0.03)' }} />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium opacity-0 animate-fade-up"
            style={{ backgroundColor: '#ffffff', color: '#1a1a2e', borderRadius: '999px', border: '1px solid #e0e0e0' }}
          >
            <Sparkles className="h-4 w-4" />
            The smartest way to create quizzes
          </div>

          <h1
            className="mb-6 tracking-tight opacity-0 animate-fade-up [animation-delay:100ms]"
            style={{ color: '#e8e3d5', fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(3rem, 5vw, 5.5rem)', lineHeight: 1.1 }}
          >
            Build engaging quizzes{" "}
            <span style={{ color: '#1E3A5F', opacity: 0.9 }}>in</span>
            <br />
            <span style={{ color: '#F59E0B' }}>minutes</span>
          </h1>

          <p
            className="mb-10 opacity-0 animate-fade-up [animation-delay:200ms] mx-auto"
            style={{ color: 'rgba(232,227,213,0.55)', fontFamily: "'DM Sans', sans-serif", fontWeight: 300, maxWidth: '520px', lineHeight: 1.75, fontSize: '1.1rem' }}
          >
            QuizFlow helps educators, trainers, and creators build beautiful,
            interactive quizzes with AI-powered question generation, real-time
            analytics, and seamless sharing.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center opacity-0 animate-fade-up [animation-delay:300ms]">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 text-base transition-transform duration-200 hover:-translate-y-px"
              style={{
                backgroundColor: '#F59E0B',
                color: '#0a0d14',
                borderRadius: '8px',
                padding: '0.85rem 2rem',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-base transition-colors duration-200"
              style={{
                backgroundColor: 'transparent',
                color: '#e8e3d5',
                border: '1px solid rgba(232,227,213,0.2)',
                borderRadius: '8px',
                padding: '0.85rem 2rem',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              See How It Works
            </Link>
          </div>

          {/* Stats Row */}
          <div
            className="mt-14 mx-auto max-w-2xl opacity-0 animate-fade-up [animation-delay:400ms]"
            style={{
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
            }}
          >
            {[
              { number: '50K+', label: 'Quizzes Created', color: '#e8c87a' },
              { number: '2M+', label: 'Students Reached', color: '#4a9eff' },
              { number: '98%', label: 'Satisfaction Rate', color: '#4acf8e' },
            ].map((stat, i) => (
              <div
                key={i}
                className="relative px-6 py-5 text-center"
                style={{
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                }}
              >
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: '40px',
                    height: '2px',
                    backgroundColor: stat.color,
                  }}
                />
                <div
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", color: '#e8e3d5' }}
                >
                  {stat.number}
                </div>
                <div
                  className="mt-1 text-[10px] font-medium tracking-widest uppercase"
                  style={{ color: 'rgba(232,227,213,0.4)' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
