import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-32 md:pt-40 pb-16">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground opacity-0 animate-fade-up">
            <Sparkles className="h-4 w-4" />
            The smartest way to create quizzes
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl opacity-0 animate-fade-up [animation-delay:100ms] text-[hsl(var(--homepage-heading))]">
            Build engaging quizzes{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              in minutes
            </span>
          </h1>

          <p className="mb-10 text-lg md:text-xl opacity-0 animate-fade-up [animation-delay:200ms] text-[hsl(var(--homepage-sub))]">
            QuizFlow helps educators, trainers, and creators build beautiful,
            interactive quizzes with AI-powered question generation, real-time
            analytics, and seamless sharing.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center opacity-0 animate-fade-up [animation-delay:300ms]">
            <Button variant="hero" size="lg" className="text-base px-8 py-6">
              Get Started Free
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 bg-primary border-primary text-primary-foreground hover:bg-primary/90">
              See How It Works
            </Button>
          </div>

          {/* Stats Row */}
          <div className="mt-14 mx-auto max-w-2xl opacity-0 animate-fade-up [animation-delay:400ms] grid grid-cols-3 border border-[hsl(var(--homepage-card-border))] rounded-xl">
            {[
              { number: '50K+', label: 'Quizzes Created', color: '#e8c87a' },
              { number: '2M+', label: 'Students Reached', color: '#4a9eff' },
              { number: '98%', label: 'Satisfaction Rate', color: '#4acf8e' },
            ].map((stat, i) => (
              <div
                key={i}
                className={`relative px-6 py-5 text-center ${i < 2 ? 'border-r border-[hsl(var(--homepage-card-border))]' : ''}`}
              >
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-10"
                  style={{ backgroundColor: stat.color }}
                />
                <div className="text-2xl font-bold font-serif text-[hsl(var(--homepage-stat-text))]">
                  {stat.number}
                </div>
                <div className="mt-1 text-[10px] font-medium tracking-widest uppercase text-[hsl(var(--homepage-stat-label))]">
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
