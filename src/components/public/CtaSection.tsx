import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CtaSection = () => (
  <section className="py-24 relative">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[2.5rem] gradient-purple p-12 lg:p-20 text-center glow-purple">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-purple-glow/30 blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl mx-auto">
          <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
            Ready to build with <span className="italic gradient-text">creators?</span>
          </h2>
          <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
            Join FamePass and unlock a curated network of venues and creators built on trust, transparency, and results.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="gradient-gold text-accent-foreground hover:opacity-90 rounded-full px-10 h-14 text-base font-semibold shadow-xl shadow-primary/30">
              <Link to="/login">Get Started <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-10 h-14 text-base border-border glass hover:border-gold/40">
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default CtaSection;
