import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">1. Introduction</h2>
            <p>Welcome to FamePass. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">2. Information We Collect</h2>
            <p>We collect information that you provide directly to us, including:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Account information (name, email, phone number)</li>
              <li>Profile information (bio, social media handles, follower counts)</li>
              <li>Venue information (business name, address, category)</li>
              <li>Communication data (messages between users)</li>
              <li>Transaction and booking data</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Match influencers with relevant venue opportunities</li>
              <li>Process bookings and manage offers</li>
              <li>Send notifications and updates about your account</li>
              <li>Ensure the security and integrity of our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">4. Sharing of Information</h2>
            <p>We may share your information in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>With venues or influencers you interact with through the platform</li>
              <li>With service providers who assist in operating our platform</li>
              <li>When required by law or to protect our rights</li>
              <li>With your consent or at your direction</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">5. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">6. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify or update your personal information</li>
              <li>Delete your account and personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">7. Cookies & Analytics</h2>
            <p>We use cookies and similar tracking technologies to improve your experience on our platform. You can control cookie preferences through your browser settings.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">8. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or our data practices, please contact us at <span className="text-accent">privacy@famepass.com</span>.</p>
          </section>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default PrivacyPolicy;
