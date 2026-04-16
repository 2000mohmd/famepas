import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { Sparkles, Users, Building2, Zap } from "lucide-react";

const steps = [
  { icon: <Users className="w-8 h-8" />, title: "Create Your Profile", desc: "Sign up as an influencer and complete your profile with social links and followers." },
  { icon: <Building2 className="w-8 h-8" />, title: "Discover Venues", desc: "Browse top venues by category, search by name, or explore on the map." },
  { icon: <Sparkles className="w-8 h-8" />, title: "Apply to Offers", desc: "Find exclusive deals that match your niche and apply with one click." },
  { icon: <Zap className="w-8 h-8" />, title: "Create & Earn", desc: "Visit the venue, create content, submit deliverables, and earn rewards." },
];

const AboutPage = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-3">About Us</p>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground">
            Welcome to <span className="text-gold">FamePass</span>
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl mx-auto text-lg leading-relaxed">
            FamePass bridges the gap between influencers and premium venues. We make it effortless for creators to discover exclusive experiences, and for venues to connect with the right talent to amplify their brand.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-20">
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
            How It <span className="text-gold">Works</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative p-6 rounded-2xl bg-card border border-border text-center space-y-4 hover:border-accent/30 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto text-accent">
                  {step.icon}
                </div>
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mission */}
        <div className="rounded-2xl bg-card border border-border p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-display font-bold text-foreground mb-4">Our Mission</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We believe every creator deserves access to premium opportunities. FamePass empowers influencers of all sizes to collaborate with top venues, earn rewards, and grow their personal brand — all in one seamless platform.
          </p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default AboutPage;
