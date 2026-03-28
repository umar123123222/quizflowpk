import { Zap, BarChart3, Share2, Brain, Palette, Shield } from "lucide-react";
import { useState, useEffect } from "react";

const features = [
  { icon: Brain, title: "AI Question Generator", description: "Paste any content and let AI craft perfect questions automatically.", color: "#e09615" },
  { icon: Zap, title: "Instant Publishing", description: "Share quizzes with a link or embed them anywhere in seconds.", color: "#1E3A5F" },
  { icon: BarChart3, title: "Real-Time Analytics", description: "Track scores, completion rates, and identify knowledge gaps.", color: "#e09615" },
  { icon: Palette, title: "Custom Branding", description: "Match your brand with custom colors, logos, and themes.", color: "#1E3A5F" },
  { icon: Share2, title: "Team Collaboration", description: "Build quizzes together with your team in real time.", color: "#e09615" },
  { icon: Shield, title: "Anti-Cheat Protection", description: "Randomized questions, time limits, and proctoring tools.", color: "#1E3A5F" },
];

const Features = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section style={{ paddingTop: '4rem', paddingBottom: '5rem' }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div
            className="mb-4 text-[11px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "#e09615", fontFamily: "'DM Mono', monospace" }}
          >
            Why QuizFlow
          </div>
          <h2
            className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif", color: isDark ? "#e8e3d5" : "#0f1117" }}
          >
            Everything you need to quiz smarter
          </h2>
          <p className="text-base" style={{ color: isDark ? "rgba(232,227,213,0.5)" : "#6b7494" }}>
            Powerful features that make creating, sharing, and analyzing quizzes effortless.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-8 transition-colors duration-200"
              style={{
                backgroundColor: isDark ? "#0d1018" : "#ffffff",
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e4e8f0",
                cursor: "default",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? "#10131c" : "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isDark ? "#0d1018" : "#ffffff")}
            >
              <div
                className="mb-4 flex items-center justify-center"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: `${feature.color}15`,
                }}
              >
                <feature.icon style={{ color: feature.color, width: 20, height: 20 }} />
              </div>
              <h3 className="mb-2 text-base font-semibold" style={{ color: isDark ? "#e8e3d5" : "#0f1117" }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(232,227,213,0.45)" : "#6b7494" }}>
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
