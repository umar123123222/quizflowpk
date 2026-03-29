import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const Hero = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden pt-32 md:pt-40" style={{ paddingBottom: '4rem' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full blur-3xl" style={{ backgroundColor: isDark ? 'rgba(232,200,122,0.03)' : 'rgba(224,150,21,0.06)' }} />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full blur-3xl" style={{ backgroundColor: isDark ? 'rgba(74,158,255,0.03)' : 'rgba(58,107,171,0.06)' }} />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium opacity-0 animate-fade-up"
            style={{
              backgroundColor: isDark ? '#ffffff' : '#f0f1f5',
              color: '#1a1a2e',
              borderRadius: '999px',
              border: isDark ? '1px solid #e0e0e0' : '1px solid #d0d4de',
            }}
          >
            <Sparkles className="h-4 w-4" />
            The smartest way to create quizzes
          </div>

          <h1
            className="mb-6 tracking-tight opacity-0 animate-fade-up [animation-delay:100ms]"
            style={{
              color: isDark ? '#e8e3d5' : '#0f1117',
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900,
              fontSize: 'clamp(3rem, 5vw, 5.5rem)',
              lineHeight: 1.1,
            }}
          >
            Build engaging quizzes{" "}
            <span style={{
              background: isDark
                ? 'linear-gradient(to right, #1E3A5F 0%, #1E3A5F 60%, #c98a1a 100%)'
                : 'linear-gradient(to right, #1E3A5F 0%, #1E3A5F 60%, #e09615 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline',
            }}>in</span>
            <br />
            <span style={{
              background: isDark
                ? 'linear-gradient(to right, #1E3A5F 0%, #1E3A5F 20%, #c98a1a 70%, #c98a1a 100%)'
                : 'linear-gradient(to right, #1E3A5F 0%, #1E3A5F 20%, #e09615 70%, #e09615 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>minutes</span>
          </h1>

          <p
            className="mb-10 opacity-0 animate-fade-up [animation-delay:200ms] mx-auto"
            style={{
              color: isDark ? 'rgba(232,227,213,0.55)' : '#586380',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              maxWidth: '520px',
              lineHeight: 1.75,
              fontSize: '1.1rem',
            }}
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
                backgroundColor: '#e09615',
                color: '#ffffff',
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
                backgroundColor: '#1E3A5F',
                color: '#ffffff',
                border: 'none',
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
              border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e4e8f0',
              borderRadius: '12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              backgroundColor: isDark ? 'transparent' : '#ffffff',
            }}
          >
            {[
              { number: '50K+', label: 'Quizzes Created', color: '#e09615' },
              { number: '2M+', label: 'Students Reached', color: '#1E3A5F' },
              { number: '98%', label: 'Satisfaction Rate', color: '#e09615' },
            ].map((stat, i) => (
              <div
                key={i}
                className="relative px-6 py-5 text-center"
                style={{
                  borderRight: i < 2 ? (isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e4e8f0') : 'none',
                }}
              >
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{ width: '40px', height: '2px', backgroundColor: stat.color }}
                />
                <div
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", color: isDark ? '#e8e3d5' : '#0f1117' }}
                >
                  {stat.number}
                </div>
                <div
                  className="mt-1 text-[10px] font-medium tracking-widest uppercase"
                  style={{ color: isDark ? 'rgba(232,227,213,0.4)' : '#6b7494' }}
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
