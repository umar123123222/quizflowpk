import { Zap, BarChart3, Share2, Brain, Palette, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Question Generator",
    description: "Paste any content and let AI craft perfect questions automatically.",
  },
  {
    icon: Zap,
    title: "Instant Publishing",
    description: "Share quizzes with a link or embed them anywhere in seconds.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track scores, completion rates, and identify knowledge gaps.",
  },
  {
    icon: Palette,
    title: "Custom Branding",
    description: "Match your brand with custom colors, logos, and themes.",
  },
  {
    icon: Share2,
    title: "Team Collaboration",
    description: "Build quizzes together with your team in real time.",
  },
  {
    icon: Shield,
    title: "Anti-Cheat Protection",
    description: "Randomized questions, time limits, and proctoring tools.",
  },
];

const Features = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to{" "}
            <span className="text-accent">
              quiz smarter
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features that make creating, sharing, and analyzing quizzes effortless.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex rounded-xl bg-secondary p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
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
