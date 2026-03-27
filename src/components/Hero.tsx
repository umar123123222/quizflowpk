import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
      {/* Background decoration */}
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

          <h1
            className="mb-6 font-serif tracking-tight opacity-0 animate-fade-up [animation-delay:100ms]"
            style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', fontWeight: 900, color: '#e8e3d5' }}
          >
            Build engaging quizzes{" "}
            <span style={{ color: '#e8c87a' }}>in minutes</span>
          </h1>

          <p
            className="mb-10 font-body opacity-0 animate-fade-up [animation-delay:200ms] mx-auto"
            style={{ color: 'rgba(232,227,213,0.55)', fontWeight: 300, maxWidth: '520px', lineHeight: 1.75 }}
          >
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
        </div>

        {/* Floating preview card */}
        <div className="mx-auto mt-16 max-w-2xl opacity-0 animate-fade-up [animation-delay:500ms]">
          <div className="rounded-2xl border bg-card p-6 shadow-card animate-float">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-accent/60" />
              <div className="h-3 w-3 rounded-full bg-primary/40" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border-2 border-primary bg-secondary p-3">
                  <div className="h-3 w-full rounded bg-primary/20" />
                </div>
                <div className="flex-1 rounded-lg border bg-card p-3">
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border bg-card p-3">
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
                <div className="flex-1 rounded-lg border bg-card p-3">
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
