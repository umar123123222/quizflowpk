import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-12 text-center md:p-16">
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary-foreground/10" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary-foreground/10" />

          <h2 className="relative mb-4 text-3xl font-bold text-primary-foreground sm:text-4xl">
            Ready to transform your quizzes?
          </h2>
          <p className="relative mb-8 text-lg text-primary-foreground/80">
            Join thousands of educators and creators already using QuizFlow.
            Start for free — no credit card required.
          </p>
          <Button
            size="lg"
            className="relative bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-base px-8 py-6 shadow-lg"
          >
            Get Started Free
            <ArrowRight className="ml-1 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
