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
            className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl opacity-0 animate-fade-up [animation-delay:100ms]"
            style={{ color: '#ffffff', fontFamily: "'Playfair Display', serif" }}
          >
            Build engaging quizzes{" "}
            <span style={{ color: '#6b8cba' }}>in</span>
            <br />
            <span style={{ color: '#7a7a7a' }}>minu</span>
            <span style={{ color: '#e8a020' }}>tes</span>
          </h1>

          <p
            className="mb-10 text-lg md:text-xl opacity-0 animate-fade-up [animation-delay:200ms]"
            style={{ color: '#8892a4' }}
          >
            QuizFlow helps educators, trainers, and creators build beautiful,
            interactive quizzes with AI-powered question generation, real-time
            analytics, and seamless sharing.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center opacity-0 animate-fade-up [animation-delay:300ms]">
            <Button asChild size="lg" className="text-base border-0 font-semibold" style={{ background: 'linear-gradient(to right, #1e2d45 60%, #e8a020 100%)', color: '#ffffff', borderRadius: '10px', padding: '1rem 2rem' }}>
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" className="text-base border-0 font-semibold" style={{ backgroundColor: '#1e2d45', color: '#ffffff', borderRadius: '10px', padding: '1rem 2rem' }}>
              <Link to="/login">
                See How It Works
              </Link>
            </Button>
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
