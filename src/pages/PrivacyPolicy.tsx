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
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">FamePass Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last Updated: September 2026</p>

        <div className="max-w-none space-y-8 text-muted-foreground">
          <p>
            FamePass ("FamePass," "we," "us," or "our") respects your privacy and is committed to protecting the
            personal information you share with us.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, store, and protect information when you use the
            FamePass website, application, creator platform, and related services.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              When you register for or use FamePass, we may collect information including your name, email address,
              telephone number, profile information, account type, creator information, social-media profile
              information, and information you voluntarily provide to us.
            </p>
            <p>
              If you choose to connect an Instagram or other social-media account, we may receive information made
              available through the relevant platform and permissions you authorize, such as your Instagram
              username, account/profile information and other information permitted by the applicable API.
            </p>
            <p>We do not request or store your Instagram or Facebook password.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>
              We may use your information to operate and improve FamePass; create and manage your account; review
              and approve creator applications; verify creator profiles; match creators with suitable venues,
              experiences and collaborations; manage invitations and applications; communicate with you; provide
              customer support; prevent fraud or misuse; analyze and improve our services; and comply with legal
              obligations.
            </p>
            <p>
              Connecting a social-media account may also allow FamePass to assess whether a creator is suitable for
              particular collaborations or experiences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">3. Creator Profiles</h2>
            <p>FamePass is a curated creator platform. Creator applications may be individually reviewed before access is granted.</p>
            <p>
              Information supplied by creators or obtained through authorized social-media integrations may be used
              to evaluate creator applications and determine suitability for opportunities available through
              FamePass.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">4. Sharing of Information</h2>
            <p>We do not sell personal information.</p>
            <p>
              We may share limited information where necessary with venues, brands or partners participating in a
              FamePass collaboration; technology and service providers that help us operate the platform;
              professional advisers where necessary; or authorities when required by applicable law.
            </p>
            <p>We only share information where reasonably necessary to provide our services or where you have authorized or directed us to do so.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">5. Instagram and Meta Data</h2>
            <p>
              Where FamePass integrates with Instagram or other Meta services, information received through those
              services is processed in accordance with this Privacy Policy and applicable Meta platform
              requirements.
            </p>
            <p>FamePass uses such information only for legitimate functionality related to the services requested by the user.</p>
            <p>Access tokens, user identifiers and other platform information are protected and are not sold to third parties.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">6. Data Security</h2>
            <p>
              We use reasonable administrative, technical and organizational safeguards designed to protect personal
              information against unauthorized access, loss, misuse, alteration or disclosure.
            </p>
            <p>However, no internet-based system can guarantee absolute security.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">7. Data Retention</h2>
            <p>
              We retain personal information only for as long as reasonably necessary to provide FamePass services,
              fulfill the purposes described in this Privacy Policy, comply with applicable legal requirements and
              resolve disputes.
            </p>
            <p>Where information is no longer required, we may delete or anonymize it.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">8. Data Deletion</h2>
            <p>Users may request deletion of their FamePass account and associated personal information.</p>
            <p>
              To request deletion, contact: <span className="text-[hsl(var(--gold-dark))]">privacy@famepass.app</span>
            </p>
            <p>Please include sufficient information for us to identify your FamePass account.</p>
            <p>
              Upon receiving a valid request, we will delete or anonymize applicable personal information unless
              retention is required by law or for another legitimate legal purpose.
            </p>
            <p>
              Users who disconnect FamePass from Instagram or another third-party platform may also manage
              third-party permissions through the relevant platform's account settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">9. Your Rights</h2>
            <p>
              Depending on applicable law, you may have rights to request access to, correction of, or deletion of
              your personal information, withdraw certain consent, object to certain processing, or request
              information regarding how your personal information is used.
            </p>
            <p>
              Requests can be sent to <span className="text-[hsl(var(--gold-dark))]">privacy@famepass.app</span>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">10. Third-Party Services</h2>
            <p>FamePass may contain integrations or links to third-party services, including Instagram and Meta services.</p>
            <p>Those services operate according to their own privacy policies and terms. FamePass is not responsible for the privacy practices of independent third-party services.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">11. Children's Privacy</h2>
            <p>FamePass is not intended for children under the minimum age required to use our services under applicable law.</p>
            <p>We do not knowingly collect personal information from children where doing so would violate applicable law.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">12. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy periodically to reflect changes to FamePass, applicable law, or our technology and integrations.</p>
            <p>The updated version will be published on this page with a revised "Last Updated" date.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">13. Contact Us</h2>
            <p>For questions, privacy requests or data-deletion requests, contact:</p>
            <p>
              FamePass<br />
              Email: <span className="text-[hsl(var(--gold-dark))]">info@famepass.app</span><br />
              Website: www.famepass.app
            </p>
          </section>
        </div>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
