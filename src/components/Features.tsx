import { Zap, BarChart3, Share2, Brain, Palette, Shield } from "lucide-react";

const features = [
  { icon: Brain, title: "AI Question Generator", description: "Paste any content and let AI craft perfect questions automatically.", color: "#e8c87a" },
  { icon: Zap, title: "Instant Publishing", description: "Share quizzes with a link or embed them anywhere in seconds.", color: "#4a9eff" },
  { icon: BarChart3, title: "Real-Time Analytics", description: "Track scores, completion rates, and identify knowledge gaps.", color: "#4acf8e" },
  { icon: Palette, title: "Custom Branding", description: "Match your brand with custom colors, logos, and themes.", color: "#c084fc" },
  { icon: Share2, title: "Team Collaboration", description: "Build quizzes together with your team in real time.", color: "#4a9eff" },
  { icon: Shield, title: "Anti-Cheat Protection", description: "Randomized questions, time limits, and proctoring tools.", color: "#f87171" },
];

const Features = () => {
  return (
    <section className="pt-16 pb-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 text-[11px] font-semibold tracking-[0.2em] uppercase font-mono text-[hsl(var(--homepage-gold))]">
            Why QuizFlow
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl font-serif text-[hsl(var(--homepage-heading))]">
            Everything you need to quiz smarter
          </h2>
          <p className="text-base text-[hsl(var(--homepage-sub))]">
            Powerful features that make creating, sharing, and analyzing quizzes effortless.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-8 transition-colors duration-200 bg-[hsl(var(--homepage-card-bg))] border border-[hsl(var(--homepage-card-border))] hover:bg-[hsl(var(--homepage-card-hover))] cursor-default"
            >
              <div
                className="mb-4 flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ backgroundColor: `${feature.color}15` }}
              >
                <feature.icon style={{ color: feature.color, width: 20, height: 20 }} />
              </div>
              <h3 className="mb-2 text-base font-semibold text-[hsl(var(--homepage-heading))]">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-[hsl(var(--homepage-sub))]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
