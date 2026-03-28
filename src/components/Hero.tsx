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
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium opacity-0 animate-fade-up"
            style={{ backgroundColor: 'rgba(232,200,122,0.1)', color: '#e8c87a' }}
          >
            <Sparkles className="h-4 w-4" />
            The smartest way to create quizzes
          </div>

          <h1
            className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl opacity-0 animate-fade-up [animation-delay:100ms]"
            style={{ color: '#e8e3d5', fontFamily: "'Playfair Display', serif" }}
          >
            Build engaging quizzes{" "}
            <span style={{ color: '#e8c87a' }}>
              in minutes
            </span>
          </h1>

          <p
            className="mb-10 text-lg md:text-xl opacity-0 animate-fade-up [animation-delay:200ms]"
            style={{ color: 'rgba(232,227,213,0.5)' }}
          >
            QuizFlow helps educators, trainers, and creators build beautiful,
            interactive quizzes with AI-powered question generation, real-time
            analytics, and seamless sharing.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center opacity-0 animate-fade-up [animation-delay:300ms]">
            <Button asChild size="lg" className="text-base px-8 py-6 border-0 font-medium" style={{ backgroundColor: '#e8c87a', color: '#0a0d14', borderRadius: '8px' }}>
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" className="text-base px-8 py-6 font-medium" style={{ backgroundColor: 'transparent', color: '#e8e3d5', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' }}>
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
