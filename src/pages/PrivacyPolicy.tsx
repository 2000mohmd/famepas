import { Link } from "react-router-dom";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/welcome" className="font-display text-2xl font-semibold text-foreground">
          Fame<span className="italic text-[hsl(var(--gold-dark))]">Pass</span>
        </Link>
        <Link to="/login" className="text-sm font-medium text-foreground hover:underline">Sign in</Link>
      </div>
    </header>
    <div className="pt-12 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="max-w-none space-y-8 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">1. Introduction</h2>
            <p>Welcome to FamePass. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">2. Information We Collect</h2>
            <p>We collect information that you provide directly to us, including account, profile, venue, communication, and transaction data.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">3. How We Use Your Information</h2>
            <p>To provide and improve our services, match influencers with venues, process bookings, send notifications, ensure platform security, and comply with legal obligations.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">4. Sharing of Information</h2>
            <p>With venues or influencers you interact with, with service providers, when required by law, or with your consent.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">5. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">6. Your Rights</h2>
            <p>Access, rectify, delete, restrict processing, and port your data.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">7. Contact Us</h2>
            <p>Questions? Contact us at <span className="text-[hsl(var(--gold-dark))]">privacy@famepass.com</span>.</p>
          </section>
        </div>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
